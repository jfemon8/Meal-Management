const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const LoginHistory = require('../models/LoginHistory');
const { protect } = require('../middleware/auth');
const {
    generateTokenPair,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    getActiveSessions
} = require('../utils/tokenManager');
const { extractDeviceInfo } = require('../utils/deviceFingerprint');
const { sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail, sendLoginAlertEmail } = require('../utils/emailService');
const {
    generateSecret,
    generateQRCode,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode,
    formatBackupCodesForDisplay,
    getSetupInstructions
} = require('../utils/twoFactorAuth');

// Generate JWT Token (Legacy - kept for backward compatibility)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'default_secret', {
        expiresIn: '30d'
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
    body('name').trim().notEmpty().withMessage('নাম আবশ্যক'),
    body('email').isEmail().withMessage('সঠিক ইমেইল দিন'),
    body('password').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, phone } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.getAllPermissions(),
            balances: user.balances,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user with refresh token
// @access  Public
router.post('/login', [
    body('email').isEmail().withMessage('সঠিক ইমেইল দিন'),
    body('password').notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
], async (req, res) => {
    const deviceInfo = extractDeviceInfo(req);
    let loginHistory = null;

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            // Log failed attempt
            await LoginHistory.create({
                email,
                status: 'failed',
                loginMethod: 'password',
                deviceInfo,
                failureReason: 'invalid_credentials',
                failureMessage: 'ভুল ইমেইল বা পাসওয়ার্ড'
            });
            return res.status(401).json({ message: 'ভুল ইমেইল বা পাসওয়ার্ড' });
        }

        // Check if user is active
        if (!user.isActive) {
            await LoginHistory.create({
                user: user._id,
                email,
                status: 'failed',
                loginMethod: 'password',
                deviceInfo,
                failureReason: 'account_inactive',
                failureMessage: 'আপনার একাউন্ট নিষ্ক্রিয় করা হয়েছে'
            });
            return res.status(401).json({ message: 'আপনার একাউন্ট নিষ্ক্রিয় করা হয়েছে' });
        }

        // Check for too many failed attempts
        const recentFailedAttempts = await LoginHistory.getFailedAttemptsCount(user._id, 15);
        if (recentFailedAttempts >= 5) {
            await LoginHistory.create({
                user: user._id,
                email,
                status: 'blocked',
                loginMethod: 'password',
                deviceInfo,
                failureReason: 'too_many_attempts',
                failureMessage: 'অনেকবার ভুল চেষ্টা করেছেন। ১৫ মিনিট পরে আবার চেষ্টা করুন।'
            });
            return res.status(429).json({ message: 'অনেকবার ভুল চেষ্টা করেছেন। ১৫ মিনিট পরে আবার চেষ্টা করুন।' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            await LoginHistory.create({
                user: user._id,
                email,
                status: 'failed',
                loginMethod: 'password',
                deviceInfo,
                failureReason: 'invalid_credentials',
                failureMessage: 'ভুল ইমেইল বা পাসওয়ার্ড'
            });
            return res.status(401).json({ message: 'ভুল ইমেইল বা পাসওয়ার্ড' });
        }

        // Check if 2FA is enabled
        if (user.twoFactorAuth && user.twoFactorAuth.isEnabled) {
            return res.json({
                requires2FA: true,
                userId: user._id,
                message: '2FA কোড প্রবেশ করুন'
            });
        }

        // Check for suspicious activity
        const suspiciousCheck = await LoginHistory.checkSuspiciousActivity(user._id, deviceInfo);

        // Generate token pair
        const tokens = await generateTokenPair(user._id, deviceInfo);

        // Create login history
        loginHistory = await LoginHistory.create({
            user: user._id,
            email,
            status: 'success',
            loginMethod: 'password',
            deviceInfo,
            sessionId: tokens.tokenFamily,
            tokenFamily: tokens.tokenFamily,
            isSuspicious: suspiciousCheck.isSuspicious,
            suspiciousReasons: suspiciousCheck.reasons
        });

        // Send alert email if suspicious
        if (suspiciousCheck.isSuspicious) {
            await sendLoginAlertEmail(user.email, deviceInfo, new Date());
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.getAllPermissions(),
            balances: user.balances,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresIn: tokens.accessTokenExpiresIn,
            refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
            // Legacy token for backward compatibility (will be deprecated)
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Login Error:', error);

        // Log error if we have user info
        if (loginHistory) {
            loginHistory.status = 'failed';
            loginHistory.failureReason = 'other';
            loginHistory.failureMessage = error.message;
            await loginHistory.save();
        }

        res.status(500).json({
            message: 'সার্ভার এরর',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        const userObj = user.toObject();

        // Add computed permissions
        userObj.permissions = user.getAllPermissions();

        res.json(userObj);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', protect, [
    body('currentPassword').notEmpty().withMessage('বর্তমান পাসওয়ার্ড আবশ্যক'),
    body('newPassword').isLength({ min: 6 }).withMessage('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);

        // Check current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'বর্তমান পাসওয়ার্ড ভুল' });
        }

        user.password = newPassword;
        await user.save();

        // Revoke all existing tokens for security
        await revokeAllUserTokens(user._id, 'password_change');

        res.json({ message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। পুনরায় লগইন করুন।' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'রিফ্রেশ টোকেন আবশ্যক' });
        }

        const deviceInfo = extractDeviceInfo(req);

        // Rotate refresh token and get new pair
        const newTokens = await rotateRefreshToken(refreshToken, deviceInfo);

        res.json({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            accessTokenExpiresIn: newTokens.accessTokenExpiresIn,
            refreshTokenExpiresIn: newTokens.refreshTokenExpiresIn
        });
    } catch (error) {
        console.error('Refresh Token Error:', error);
        res.status(401).json({ message: error.message || 'টোকেন রিফ্রেশ ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user and revoke refresh token
// @access  Private
router.post('/logout', protect, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await revokeRefreshToken(refreshToken, 'user_logout');
        }

        // Find and end active session
        const activeSessions = await LoginHistory.getActiveSessions(req.user._id);
        for (const session of activeSessions) {
            await session.endSession();
        }

        res.json({ message: 'সফলভাবে লগআউট হয়েছে' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ message: 'লগআউট এ সমস্যা হয়েছে' });
    }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all', protect, async (req, res) => {
    try {
        // Revoke all refresh tokens
        await revokeAllUserTokens(req.user._id, 'user_logout_all');

        // End all active sessions
        const activeSessions = await LoginHistory.getActiveSessions(req.user._id);
        for (const session of activeSessions) {
            await session.endSession();
        }

        res.json({ message: 'সকল ডিভাইস থেকে লগআউট হয়েছে' });
    } catch (error) {
        console.error('Logout All Error:', error);
        res.status(500).json({ message: 'লগআউট এ সমস্যা হয়েছে' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', [
    body('email').isEmail().withMessage('সঠিক ইমেইল দিন')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const deviceInfo = extractDeviceInfo(req);

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: 'যদি এই ইমেইল বৈধ হয়, তবে পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে' });
        }

        // Check rate limiting
        await OTP.checkRateLimit(email, 'password_reset', 15, 3);

        // Generate OTP
        const { otpDoc, otpCode } = await OTP.generate({
            user: user._id,
            identifier: email,
            identifierType: 'email',
            purpose: 'password_reset',
            expiryMinutes: 10,
            deviceInfo
        });

        // Send OTP via email
        await sendOTPEmail(email, otpCode, 'password_reset', 10);

        res.json({
            message: 'পাসওয়ার্ড রিসেট কোড আপনার ইমেইলে পাঠানো হয়েছে',
            expiresIn: 10 * 60 // 10 minutes in seconds
        });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: error.message || 'সার্ভার এরর' });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post('/reset-password', [
    body('email').isEmail().withMessage('সঠিক ইমেইল দিন'),
    body('otp').notEmpty().withMessage('OTP আবশ্যক'),
    body('newPassword').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, otp, newPassword } = req.body;

        // Verify OTP
        await OTP.verifyByIdentifier(email, otp, 'password_reset');

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Revoke all existing tokens
        await revokeAllUserTokens(user._id, 'password_reset');

        res.json({ message: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(400).json({ message: error.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/auth/request-otp
// @desc    Request OTP for login or verification
// @access  Public
router.post('/request-otp', [
    body('identifier').notEmpty().withMessage('ইমেইল বা ফোন নম্বর আবশ্যক'),
    body('purpose').isIn(['login', 'email_verification', 'phone_verification']).withMessage('অবৈধ উদ্দেশ্য')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, purpose } = req.body;
        const deviceInfo = extractDeviceInfo(req);

        // Determine identifier type
        const identifierType = identifier.includes('@') ? 'email' : 'phone';

        // Find user
        const user = await User.findOne(
            identifierType === 'email' ? { email: identifier } : { phone: identifier }
        );

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'আপনার একাউন্ট নিষ্ক্রিয় করা হয়েছে' });
        }

        // Check rate limiting
        await OTP.checkRateLimit(identifier, purpose, 15, 3);

        // Generate OTP
        const { otpDoc, otpCode } = await OTP.generate({
            user: user._id,
            identifier,
            identifierType,
            purpose,
            expiryMinutes: 10,
            deviceInfo
        });

        // Send OTP
        if (identifierType === 'email') {
            await sendOTPEmail(identifier, otpCode, purpose, 10);
        } else {
            // TODO: Implement SMS sending
            console.log(`📱 SMS OTP to ${identifier}: ${otpCode}`);
        }

        res.json({
            message: `OTP ${identifierType === 'email' ? 'ইমেইলে' : 'ফোনে'} পাঠানো হয়েছে`,
            expiresIn: 10 * 60
        });
    } catch (error) {
        console.error('Request OTP Error:', error);
        res.status(500).json({ message: error.message || 'সার্ভার এরর' });
    }
});

// @route   POST /api/auth/login-otp
// @desc    Login using OTP
// @access  Public
router.post('/login-otp', [
    body('identifier').notEmpty().withMessage('ইমেইল বা ফোন নম্বর আবশ্যক'),
    body('otp').notEmpty().withMessage('OTP আবশ্যক')
], async (req, res) => {
    const deviceInfo = extractDeviceInfo(req);

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, otp } = req.body;

        // Verify OTP
        await OTP.verifyByIdentifier(identifier, otp, 'login');

        // Determine identifier type
        const identifierType = identifier.includes('@') ? 'email' : 'phone';

        // Find user
        const user = await User.findOne(
            identifierType === 'email' ? { email: identifier } : { phone: identifier }
        );

        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'লগইন ব্যর্থ হয়েছে' });
        }

        // Generate token pair
        const tokens = await generateTokenPair(user._id, deviceInfo);

        // Create login history
        await LoginHistory.create({
            user: user._id,
            email: user.email,
            status: 'success',
            loginMethod: identifierType === 'email' ? 'otp_email' : 'otp_phone',
            deviceInfo,
            sessionId: tokens.tokenFamily,
            tokenFamily: tokens.tokenFamily
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.getAllPermissions(),
            balances: user.balances,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresIn: tokens.accessTokenExpiresIn,
            refreshTokenExpiresIn: tokens.refreshTokenExpiresIn
        });
    } catch (error) {
        console.error('OTP Login Error:', error);
        res.status(400).json({ message: error.message || 'লগইন ব্যর্থ হয়েছে' });
    }
});

// @route   GET /api/auth/sessions
// @desc    Get all active sessions
// @access  Private
router.get('/sessions', protect, async (req, res) => {
    try {
        const sessions = await getActiveSessions(req.user._id);

        const formattedSessions = sessions.map(session => ({
            _id: session._id,
            deviceInfo: session.deviceInfo,
            createdAt: session.createdAt,
            lastUsedAt: session.lastUsedAt,
            expiresAt: session.expiresAt,
            isCurrent: req.headers.authorization?.includes(session.token) || false
        }));

        res.json(formattedSessions);
    } catch (error) {
        console.error('Get Sessions Error:', error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/auth/login-history
// @desc    Get login history
// @access  Private
router.get('/login-history', protect, async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const history = await LoginHistory.find({ user: req.user._id })
            .sort({ loginAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await LoginHistory.countDocuments({ user: req.user._id });

        res.json({
            history,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get Login History Error:', error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/auth/login-stats
// @desc    Get login statistics
// @access  Private
router.get('/login-stats', protect, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const stats = await LoginHistory.getLoginStats(req.user._id, parseInt(days));

        res.json(stats);
    } catch (error) {
        console.error('Get Login Stats Error:', error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Two-Factor Authentication (2FA) Endpoints ====================

// @route   POST /api/auth/2fa/setup
// @desc    Generate 2FA secret and QR code for user
// @access  Private
router.post('/2fa/setup', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Generate new secret
        const { secret, otpauthUrl } = generateSecret(user.email, user.name);

        // Generate QR code
        const qrCodeDataURL = await generateQRCode(otpauthUrl);

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);

        // Get setup instructions
        const instructions = getSetupInstructions();

        // Store secret temporarily (not enabled yet)
        user.twoFactorAuth.secret = secret;
        user.twoFactorAuth.backupCodes = backupCodes;
        await user.save();

        res.json({
            secret,
            qrCode: qrCodeDataURL,
            backupCodes: formatBackupCodesForDisplay(backupCodes),
            instructions,
            message: '2FA সেটআপ শুরু হয়েছে। QR কোড স্ক্যান করুন এবং যাচাই করুন।'
        });
    } catch (error) {
        console.error('2FA Setup Error:', error);
        res.status(500).json({ message: error.message || '2FA সেটআপ ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/auth/2fa/verify-setup
// @desc    Verify and enable 2FA
// @access  Private
router.post('/2fa/verify-setup', protect, [
    body('token').notEmpty().withMessage('টোকেন আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { token } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.twoFactorAuth.secret) {
            return res.status(400).json({ message: 'প্রথমে 2FA সেটআপ শুরু করুন' });
        }

        // Verify token
        const isValid = verifyToken(token, user.twoFactorAuth.secret);

        if (!isValid) {
            return res.status(400).json({ message: 'ভুল টোকেন। আবার চেষ্টা করুন।' });
        }

        // Enable 2FA
        user.twoFactorAuth.isEnabled = true;
        user.twoFactorAuth.enabledAt = new Date();
        user.twoFactorAuth.method = 'totp';
        await user.save();

        // Revoke all existing sessions for security
        await revokeAllUserTokens(user._id, '2fa_enabled');

        res.json({
            message: '2FA সফলভাবে সক্রিয় হয়েছে। ব্যাকআপ কোডগুলি নিরাপদ স্থানে সংরক্ষণ করুন।',
            backupCodes: formatBackupCodesForDisplay(user.twoFactorAuth.backupCodes),
            enabled: true
        });
    } catch (error) {
        console.error('2FA Verify Setup Error:', error);
        res.status(500).json({ message: error.message || '2FA সক্রিয়করণ ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/auth/2fa/verify
// @desc    Verify 2FA token during login
// @access  Public (but requires temporary login token)
router.post('/2fa/verify', [
    body('userId').notEmpty().withMessage('ইউজার আইডি আবশ্যক'),
    body('token').notEmpty().withMessage('টোকেন আবশ্যক')
], async (req, res) => {
    const deviceInfo = extractDeviceInfo(req);

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, token, useBackupCode } = req.body;

        const user = await User.findById(userId);

        if (!user || !user.twoFactorAuth.isEnabled) {
            return res.status(400).json({ message: 'অবৈধ অনুরোধ' });
        }

        let isValid = false;

        if (useBackupCode) {
            // Verify backup code
            const { valid, codeIndex } = verifyBackupCode(token, user.twoFactorAuth.backupCodes);

            if (valid) {
                // Mark backup code as used
                user.twoFactorAuth.backupCodes[codeIndex].used = true;
                user.twoFactorAuth.backupCodes[codeIndex].usedAt = new Date();
                await user.save();
                isValid = true;
            }
        } else {
            // Verify TOTP token
            isValid = verifyToken(token, user.twoFactorAuth.secret);
        }

        if (!isValid) {
            // Log failed 2FA attempt
            await LoginHistory.create({
                user: user._id,
                email: user.email,
                status: 'failed',
                loginMethod: '2fa',
                deviceInfo,
                failureReason: 'invalid_2fa_token',
                failureMessage: 'ভুল 2FA টোকেন'
            });

            return res.status(400).json({ message: 'ভুল টোকেন। আবার চেষ্টা করুন।' });
        }

        // Generate token pair
        const tokens = await generateTokenPair(user._id, deviceInfo);

        // Create login history
        await LoginHistory.create({
            user: user._id,
            email: user.email,
            status: 'success',
            loginMethod: '2fa',
            deviceInfo,
            sessionId: tokens.tokenFamily,
            tokenFamily: tokens.tokenFamily
        });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.getAllPermissions(),
            balances: user.balances,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessTokenExpiresIn: tokens.accessTokenExpiresIn,
            refreshTokenExpiresIn: tokens.refreshTokenExpiresIn
        });
    } catch (error) {
        console.error('2FA Verify Error:', error);
        res.status(400).json({ message: error.message || '2FA যাচাই ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/auth/2fa/disable
// @desc    Disable 2FA
// @access  Private
router.post('/2fa/disable', protect, [
    body('password').notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { password } = req.body;
        const user = await User.findById(req.user._id);

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'ভুল পাসওয়ার্ড' });
        }

        // Disable 2FA
        user.twoFactorAuth.isEnabled = false;
        user.twoFactorAuth.secret = null;
        user.twoFactorAuth.backupCodes = [];
        await user.save();

        res.json({ message: '2FA নিষ্ক্রিয় করা হয়েছে' });
    } catch (error) {
        console.error('2FA Disable Error:', error);
        res.status(500).json({ message: '2FA নিষ্ক্রিয় করতে ব্যর্থ হয়েছে' });
    }
});

// @route   GET /api/auth/2fa/status
// @desc    Get 2FA status for current user
// @access  Private
router.get('/2fa/status', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const unusedBackupCodes = user.twoFactorAuth.backupCodes
            ? user.twoFactorAuth.backupCodes.filter(bc => !bc.used).length
            : 0;

        res.json({
            isEnabled: user.twoFactorAuth.isEnabled || false,
            method: user.twoFactorAuth.method || null,
            enabledAt: user.twoFactorAuth.enabledAt || null,
            backupCodesRemaining: unusedBackupCodes
        });
    } catch (error) {
        console.error('2FA Status Error:', error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/auth/2fa/regenerate-backup-codes
// @desc    Regenerate backup codes
// @access  Private
router.post('/2fa/regenerate-backup-codes', protect, [
    body('password').notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { password } = req.body;
        const user = await User.findById(req.user._id);

        if (!user.twoFactorAuth.isEnabled) {
            return res.status(400).json({ message: '2FA সক্রিয় নেই' });
        }

        // Verify password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'ভুল পাসওয়ার্ড' });
        }

        // Generate new backup codes
        const backupCodes = generateBackupCodes(10);
        user.twoFactorAuth.backupCodes = backupCodes;
        await user.save();

        res.json({
            message: 'নতুন ব্যাকআপ কোড তৈরি হয়েছে',
            backupCodes: formatBackupCodesForDisplay(backupCodes)
        });
    } catch (error) {
        console.error('Regenerate Backup Codes Error:', error);
        res.status(500).json({ message: 'ব্যাকআপ কোড তৈরি করতে ব্যর্থ হয়েছে' });
    }
});

module.exports = router;
