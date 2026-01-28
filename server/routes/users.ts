import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { protect, isManager, isAdmin, isSuperAdmin } from '../middleware/auth';
import { formatDateISO, formatDateBn, formatDateTime, nowBD, toBDTime } from '../utils/dateUtils';
import { AuthRequest } from '../types';

const router = express.Router();

// @route   POST /api/users
// @desc    Create a new user (Admin+ only)
// @access  Private (Admin+)
router.post('/', protect, isAdmin, [
    body('name').trim().notEmpty().withMessage('নাম আবশ্যক'),
    body('email').isEmail().withMessage('সঠিক ইমেইল দিন'),
    body('password').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
    body('role').optional().isIn(['user', 'manager', 'admin']).withMessage('অবৈধ রোল')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, phone, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'এই ইমেইল দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে' });
        }

        if (role === 'admin' && req.user!.role !== 'superadmin') {
            return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন নতুন এডমিন তৈরি করতে পারবে' });
        }

        const user = await User.create({ name, email, password, phone, role: role || 'user' });

        res.status(201).json({
            message: 'ইউজার সফলভাবে তৈরি হয়েছে',
            user: { _id: user._id, name: user.name, email: user.email, role: user.role, balances: user.balances, isActive: user.isActive }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.get('/', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (req.user!._id.toString() !== req.params.id && !['manager', 'admin', 'superadmin'].includes(req.user!.role)) {
            return res.status(403).json({ message: 'অনুমোদন নেই' });
        }
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.put('/:id', protect, [
    body('name').optional().trim().notEmpty().withMessage('নাম খালি রাখা যাবে না'),
    body('email').optional().isEmail().withMessage('সঠিক ইমেইল দিন')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        if (req.user!._id.toString() !== req.params.id && !['admin', 'superadmin'].includes(req.user!.role)) {
            return res.status(403).json({ message: 'অনুমোদন নেই' });
        }

        const { name, email, phone, profileImage } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) return res.status(400).json({ message: 'এই ইমেইল আগে থেকেই ব্যবহৃত' });
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

router.put('/:id/role', protect, isAdmin, [
    body('role').isIn(['user', 'manager', 'admin']).withMessage('অবৈধ রোল')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { role } = req.body;
        if (role === 'admin' && req.user!.role !== 'superadmin') {
            return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন নতুন এডমিন বানাতে পারবে' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        if (user.role === 'superadmin') return res.status(403).json({ message: 'সুপার এডমিনের রোল পরিবর্তন করা যাবে না' });

        user.role = role;
        await user.save();
        res.json({ message: 'রোল সফলভাবে পরিবর্তন হয়েছে', user: await User.findById(req.params.id).select('-password') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.put('/:id/permissions', protect, isSuperAdmin, [
    body('permissions').isArray().withMessage('permissions অ্যারে হতে হবে')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { permissions } = req.body;
        const { PERMISSIONS } = require('../config/permissions');

        const validPermissions = Object.values(PERMISSIONS);
        const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p));
        if (invalidPerms.length > 0) {
            return res.status(400).json({ message: `অবৈধ পারমিশন: ${invalidPerms.join(', ')}` });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        if (user.role === 'superadmin') return res.status(403).json({ message: 'সুপার এডমিনের পারমিশন পরিবর্তন করা যাবে না' });

        user.permissions = permissions;
        await user.save();
        res.json({ message: 'পারমিশন সফলভাবে আপডেট হয়েছে', user: await User.findById(req.params.id).select('-password') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.get('/:id/permissions', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('name email role permissions');
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });

        const { PERMISSIONS, getRolePermissions } = require('../config/permissions');
        const rolePermissions = getRolePermissions(user.role);
        const customPermissions = user.permissions || [];
        const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

        res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role }, rolePermissions, customPermissions, allPermissions, availablePermissions: PERMISSIONS });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.put('/:id/balance', protect, isManager, [
    body('amount').isNumeric().withMessage('পরিমাণ সংখ্যা হতে হবে'),
    body('balanceType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('অবৈধ ব্যালেন্স টাইপ'),
    body('type').isIn(['deposit', 'deduction', 'adjustment']).withMessage('অবৈধ ট্রান্সাকশন টাইপ')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { amount, balanceType, type, description } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });

        if (user.balances[balanceType as keyof typeof user.balances].isFrozen) {
            return res.status(403).json({
                message: `${balanceType} ব্যালেন্স ফ্রিজ করা আছে। ব্যালেন্স আনফ্রিজ করে তারপর আপডেট করুন।`,
                freezeInfo: {
                    frozenAt: user.balances[balanceType as keyof typeof user.balances].frozenAt,
                    frozenBy: user.balances[balanceType as keyof typeof user.balances].frozenBy,
                    frozenReason: user.balances[balanceType as keyof typeof user.balances].frozenReason
                }
            });
        }

        const previousBalance = user.balances[balanceType as keyof typeof user.balances].amount;
        let newBalance: number;

        if (type === 'deposit') {
            newBalance = previousBalance + Math.abs(amount);
        } else if (type === 'deduction') {
            newBalance = previousBalance - Math.abs(amount);
        } else {
            newBalance = amount;
        }

        user.balances[balanceType as keyof typeof user.balances].amount = newBalance;
        await user.save();

        await Transaction.create({
            user: user._id, type, balanceType,
            amount: type === 'deduction' ? -Math.abs(amount) : Math.abs(amount),
            previousBalance, newBalance,
            description: description || `${type} - ${balanceType}`,
            performedBy: req.user!._id
        });

        res.json({ message: 'ব্যালেন্স সফলভাবে আপডেট হয়েছে', balances: user.balances });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.put('/:id/status', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { isActive } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        if (user.role === 'superadmin') return res.status(403).json({ message: 'সুপার এডমিনকে নিষ্ক্রিয় করা যাবে না' });

        user.isActive = isActive;
        await user.save();
        res.json({ message: isActive ? 'ইউজার সক্রিয় করা হয়েছে' : 'ইউজার নিষ্ক্রিয় করা হয়েছে', user: await User.findById(req.params.id).select('-password') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.get('/notification-preferences', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user: any = await User.findById(req.user!._id).select('notificationPreferences');
        res.json(user.notificationPreferences || {
            email: { enabled: true, lowBalance: true, mealReminder: true, monthlyReport: true, systemUpdates: false },
            push: { enabled: false, lowBalance: true, mealReminder: true },
            sms: { enabled: false, lowBalance: false }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.put('/notification-preferences', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { email, push, sms } = req.body;
        const user: any = await User.findById(req.user!._id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });

        if (email !== undefined) user.notificationPreferences.email = { ...user.notificationPreferences.email, ...email };
        if (push !== undefined) user.notificationPreferences.push = { ...user.notificationPreferences.push, ...push };
        if (sms !== undefined) user.notificationPreferences.sms = { ...user.notificationPreferences.sms, ...sms };

        await user.save();
        res.json({ message: 'নোটিফিকেশন সেটিংস আপডেট হয়েছে', notificationPreferences: user.notificationPreferences });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.post('/:id/reset-password', protect, isAdmin, [
    body('newPassword').isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'),
    body('forceChangeOnLogin').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const { newPassword, forceChangeOnLogin = true } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });

        if (['admin', 'superadmin'].includes(user.role) && req.user!.role !== 'superadmin') {
            return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন অন্য এডমিনের পাসওয়ার্ড রিসেট করতে পারবে' });
        }
        if (user.role === 'superadmin' && req.user!._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'সুপার এডমিনের পাসওয়ার্ড রিসেট করা যাবে না' });
        }

        user.password = newPassword;
        user.mustChangePassword = forceChangeOnLogin;
        user.passwordResetBy = req.user!._id;
        user.passwordResetAt = new Date();
        await user.save();

        res.json({ message: 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে', forceChangeOnLogin });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

router.delete('/:id', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        if (user.role === 'superadmin') return res.status(403).json({ message: 'সুপার এডমিন ডিলিট করা যাবে না' });

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'ইউজার সফলভাবে ডিলিট হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

export default router;
