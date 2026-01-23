const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate 2FA secret for user
 * @param {string} userEmail - User's email
 * @param {string} userName - User's name
 * @returns {Object} Secret and OTP Auth URL
 */
const generateSecret = (userEmail, userName) => {
    const secret = speakeasy.generateSecret({
        name: `Meal Management (${userEmail})`,
        issuer: 'Meal Management System',
        length: 32
    });

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url
    };
};

/**
 * Generate QR code from OTP Auth URL
 * @param {string} otpauthUrl - OTP Auth URL
 * @returns {Promise<string>} QR code as data URL
 */
const generateQRCode = async (otpauthUrl) => {
    try {
        const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
        return qrCodeDataURL;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('QR কোড তৈরি করতে ব্যর্থ');
    }
};

/**
 * Verify TOTP token
 * @param {string} token - 6-digit token from authenticator app
 * @param {string} secret - User's 2FA secret
 * @param {number} window - Time window for verification (default: 1)
 * @returns {boolean} True if valid
 */
const verifyToken = (token, secret, window = 1) => {
    try {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: window // Allow 30 seconds before/after
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
};

/**
 * Generate backup codes
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {Array<Object>} Array of backup code objects
 */
const generateBackupCodes = (count = 10) => {
    const codes = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const formattedCode = code.match(/.{1,4}/g).join('-'); // Format: XXXX-XXXX

        codes.push({
            code: formattedCode,
            used: false
        });
    }

    return codes;
};

/**
 * Verify backup code
 * @param {string} code - Backup code to verify
 * @param {Array} backupCodes - Array of user's backup codes
 * @returns {Object} { valid: boolean, codeIndex: number }
 */
const verifyBackupCode = (code, backupCodes) => {
    const normalizedCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    for (let i = 0; i < backupCodes.length; i++) {
        const storedCode = backupCodes[i].code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

        if (storedCode === normalizedCode && !backupCodes[i].used) {
            return {
                valid: true,
                codeIndex: i
            };
        }
    }

    return {
        valid: false,
        codeIndex: -1
    };
};

/**
 * Format backup codes for display (Bengali)
 * @param {Array} backupCodes - Array of backup code objects
 * @returns {Array<string>} Formatted codes for display
 */
const formatBackupCodesForDisplay = (backupCodes) => {
    return backupCodes
        .filter(bc => !bc.used)
        .map(bc => bc.code);
};

/**
 * Get current TOTP token (for testing/development)
 * @param {string} secret - User's 2FA secret
 * @returns {string} Current 6-digit token
 */
const getCurrentToken = (secret) => {
    return speakeasy.totp({
        secret: secret,
        encoding: 'base32'
    });
};

/**
 * Get time remaining for current token (in seconds)
 * @returns {number} Seconds remaining
 */
const getTimeRemaining = () => {
    const epoch = Math.floor(Date.now() / 1000);
    const countDown = 30 - (epoch % 30);
    return countDown;
};

/**
 * Validate backup code format
 * @param {string} code - Code to validate
 * @returns {boolean} True if format is valid
 */
const isValidBackupCodeFormat = (code) => {
    // Format: XXXX-XXXX (8 hex characters with optional dash)
    const normalized = code.replace(/[^A-Z0-9]/gi, '');
    return /^[A-F0-9]{8}$/i.test(normalized);
};

/**
 * Generate setup instructions in Bengali
 * @param {string} appName - Name of the authenticator app (Google Authenticator, Authy, etc.)
 * @returns {Array<string>} Step-by-step instructions
 */
const getSetupInstructions = (appName = 'Google Authenticator') => {
    return [
        `${appName} অ্যাপ ডাউনলোড করুন (যদি ইতিমধ্যে না থাকে)`,
        'অ্যাপে "+" বা "Add Account" বাটনে ক্লিক করুন',
        'QR কোড স্ক্যান করুন অথবা সিক্রেট কী ম্যানুয়ালি প্রবেশ করান',
        'অ্যাপে দেখানো 6 ডিজিটের কোড প্রবেশ করে যাচাই করুন',
        'ব্যাকআপ কোডগুলি নিরাপদ স্থানে সংরক্ষণ করুন'
    ];
};

/**
 * Check if 2FA is required for user based on role
 * @param {string} role - User's role
 * @returns {boolean} True if 2FA is recommended/required
 */
const is2FARecommended = (role) => {
    // Recommend 2FA for admin and superadmin roles
    return ['admin', 'superadmin'].includes(role);
};

module.exports = {
    generateSecret,
    generateQRCode,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode,
    formatBackupCodesForDisplay,
    getCurrentToken,
    getTimeRemaining,
    isValidBackupCodeFormat,
    getSetupInstructions,
    is2FARecommended
};
