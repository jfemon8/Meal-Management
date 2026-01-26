const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, isManager, isAdmin, isSuperAdmin } = require('../middleware/auth');

// @route   POST /api/users
// @desc    Create a new user (Admin+ only)
// @access  Private (Admin+)
router.post('/', protect, isAdmin, [
    body('name').trim().notEmpty().withMessage('নাম আবশ্যক'),
    body('email').isEmail().withMessage('সঠিক ইমেইল দিন'),
    body('password').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
    body('role').optional().isIn(['user', 'manager', 'admin']).withMessage('অবৈধ রোল')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, phone, role } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে' });
        }

        // Only superadmin can create admin users
        if (role === 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন নতুন এডমিন তৈরি করতে পারবে' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            role: role || 'user'
        });

        res.status(201).json({
            message: 'ইউজার সফলভাবে তৈরি হয়েছে',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                balances: user.balances,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/users
// @desc    Get all users (for manager+)
// @access  Private (Manager+)
router.get('/', protect, isManager, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        // Users can only see their own profile, managers+ can see all
        if (req.user._id.toString() !== req.params.id &&
            !['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'অনুমোদন নেই' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private
router.put('/:id', protect, [
    body('name').optional().trim().notEmpty().withMessage('নাম খালি রাখা যাবে না'),
    body('email').optional().isEmail().withMessage('সঠিক ইমেইল দিন')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Users can only update their own profile, admin+ can update all
        if (req.user._id.toString() !== req.params.id &&
            !['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'অনুমোদন নেই' });
        }

        const { name, email, phone, profileImage } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check email uniqueness if email is being changed
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ message: 'এই ইমেইল আগে থেকেই ব্যবহৃত' });
            }
            user.email = email;
        }

        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (profileImage !== undefined) user.profileImage = profileImage;

        await user.save();

        res.json(await User.findById(req.params.id).select('-password'));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role (Admin+ only)
// @access  Private (Admin+)
router.put('/:id/role', protect, isAdmin, [
    body('role').isIn(['user', 'manager', 'admin']).withMessage('অবৈধ রোল')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { role } = req.body;

        // Only superadmin can make someone admin
        if (role === 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন নতুন এডমিন বানাতে পারবে' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Can't change superadmin role
        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'সুপার এডমিনের রোল পরিবর্তন করা যাবে না' });
        }

        user.role = role;
        await user.save();

        res.json({ message: 'রোল সফলভাবে পরিবর্তন হয়েছে', user: await User.findById(req.params.id).select('-password') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/users/:id/permissions
// @desc    Update user custom permissions (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/:id/permissions', protect, isSuperAdmin, [
    body('permissions').isArray().withMessage('permissions অ্যারে হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { permissions } = req.body;
        const { PERMISSIONS } = require('../config/permissions');

        // Validate all permissions exist
        const validPermissions = Object.values(PERMISSIONS);
        const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
        if (invalidPerms.length > 0) {
            return res.status(400).json({
                message: `অবৈধ পারমিশন: ${invalidPerms.join(', ')}`
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Can't modify superadmin permissions
        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'সুপার এডমিনের পারমিশন পরিবর্তন করা যাবে না' });
        }

        user.permissions = permissions;
        await user.save();

        res.json({
            message: 'পারমিশন সফলভাবে আপডেট হয়েছে',
            user: await User.findById(req.params.id).select('-password')
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/users/:id/permissions
// @desc    Get user permissions (Admin+ only)
// @access  Private (Admin+)
router.get('/:id/permissions', protect, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('name email role permissions');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        const { PERMISSIONS, getRolePermissions } = require('../config/permissions');
        const rolePermissions = getRolePermissions(user.role);
        const customPermissions = user.permissions || [];
        const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            rolePermissions,
            customPermissions,
            allPermissions,
            availablePermissions: PERMISSIONS
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/users/:id/balance
// @desc    Add/Deposit balance (Manager+ only)
// @access  Private (Manager+)
router.put('/:id/balance', protect, isManager, [
    body('amount').isNumeric().withMessage('পরিমাণ সংখ্যা হতে হবে'),
    body('balanceType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('অবৈধ ব্যালেন্স টাইপ'),
    body('type').isIn(['deposit', 'deduction', 'adjustment']).withMessage('অবৈধ ট্রান্সাকশন টাইপ')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount, balanceType, type, description } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check if balance is frozen
        if (user.balances[balanceType].isFrozen) {
            return res.status(403).json({
                message: `${balanceType} ব্যালেন্স ফ্রিজ করা আছে। ব্যালেন্স আনফ্রিজ করে তারপর আপডেট করুন।`,
                freezeInfo: {
                    frozenAt: user.balances[balanceType].frozenAt,
                    frozenBy: user.balances[balanceType].frozenBy,
                    frozenReason: user.balances[balanceType].frozenReason
                }
            });
        }

        const previousBalance = user.balances[balanceType].amount;
        let newBalance;

        if (type === 'deposit') {
            newBalance = previousBalance + Math.abs(amount);
        } else if (type === 'deduction') {
            newBalance = previousBalance - Math.abs(amount);
        } else {
            newBalance = amount; // Direct adjustment
        }

        user.balances[balanceType].amount = newBalance;
        await user.save();

        // Create transaction record
        await Transaction.create({
            user: user._id,
            type,
            balanceType,
            amount: type === 'deduction' ? -Math.abs(amount) : Math.abs(amount),
            previousBalance,
            newBalance,
            description: description || `${type} - ${balanceType}`,
            performedBy: req.user._id
        });

        res.json({
            message: 'ব্যালেন্স সফলভাবে আপডেট হয়েছে',
            balances: user.balances
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/users/:id/status
// @desc    Activate/Deactivate user (Admin+ only)
// @access  Private (Admin+)
router.put('/:id/status', protect, isAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Can't deactivate superadmin
        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'সুপার এডমিনকে নিষ্ক্রিয় করা যাবে না' });
        }

        user.isActive = isActive;
        await user.save();

        res.json({
            message: isActive ? 'ইউজার সক্রিয় করা হয়েছে' : 'ইউজার নিষ্ক্রিয় করা হয়েছে',
            user: await User.findById(req.params.id).select('-password')
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/users/notification-preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/notification-preferences', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('notificationPreferences');
        res.json(user.notificationPreferences || {
            email: {
                enabled: true,
                lowBalance: true,
                mealReminder: true,
                monthlyReport: true,
                systemUpdates: false
            },
            push: {
                enabled: false,
                lowBalance: true,
                mealReminder: true
            },
            sms: {
                enabled: false,
                lowBalance: false
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/users/notification-preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/notification-preferences', protect, async (req, res) => {
    try {
        const { email, push, sms } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Update notification preferences
        if (email !== undefined) {
            user.notificationPreferences.email = {
                ...user.notificationPreferences.email,
                ...email
            };
        }
        if (push !== undefined) {
            user.notificationPreferences.push = {
                ...user.notificationPreferences.push,
                ...push
            };
        }
        if (sms !== undefined) {
            user.notificationPreferences.sms = {
                ...user.notificationPreferences.sms,
                ...sms
            };
        }

        await user.save();

        res.json({
            message: 'নোটিফিকেশন সেটিংস আপডেট হয়েছে',
            notificationPreferences: user.notificationPreferences
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password by Admin (Admin+ only)
// @access  Private (Admin+)
router.post('/:id/reset-password', protect, isAdmin, [
    body('newPassword').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
    body('forceChangeOnLogin').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { newPassword, forceChangeOnLogin = true } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Only superadmin can reset admin/superadmin passwords
        if (['admin', 'superadmin'].includes(user.role) && req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন অন্য এডমিনের পাসওয়ার্ড রিসেট করতে পারবে' });
        }

        // Can't reset superadmin password (only superadmin themselves can)
        if (user.role === 'superadmin' && req.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'সুপার এডমিনের পাসওয়ার্ড রিসেট করা যাবে না' });
        }

        // Set new password
        user.password = newPassword;
        user.mustChangePassword = forceChangeOnLogin;
        user.passwordResetBy = req.user._id;
        user.passwordResetAt = new Date();
        await user.save();

        res.json({
            message: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে',
            forceChangeOnLogin
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (SuperAdmin only)
// @access  Private (SuperAdmin)
router.delete('/:id', protect, isSuperAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Can't delete superadmin
        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'সুপার এডমিন ডিলিট করা যাবে না' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'ইউজার সফলভাবে ডিলিট হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
