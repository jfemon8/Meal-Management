const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Meal = require('../models/Meal');
const Breakfast = require('../models/Breakfast');
const MonthSettings = require('../models/MonthSettings');
const MealAuditLog = require('../models/MealAuditLog');
const { protect, isSuperAdmin, isAdmin } = require('../middleware/auth');

// ==================== System-Wide Rate Update ====================

// @route   PUT /api/super-admin/bulk-rate-update
// @desc    Update meal rates across all months (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/bulk-rate-update', protect, isSuperAdmin, [
    body('lunchRate').optional().isNumeric().withMessage('লাঞ্চ রেট সংখ্যা হতে হবে'),
    body('dinnerRate').optional().isNumeric().withMessage('ডিনার রেট সংখ্যা হতে হবে'),
    body('applyTo').isIn(['all', 'future', 'unfinalizedOnly']).withMessage('অবৈধ অ্যাপ্লাই টাইপ')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { lunchRate, dinnerRate, applyTo } = req.body;

        if (lunchRate === undefined && dinnerRate === undefined) {
            return res.status(400).json({ message: 'অন্তত একটি রেট দিতে হবে' });
        }

        let query = {};
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;

        switch (applyTo) {
            case 'future':
                // Only future months
                query = {
                    $or: [
                        { year: { $gt: currentYear } },
                        { year: currentYear, month: { $gte: currentMonth } }
                    ]
                };
                break;
            case 'unfinalizedOnly':
                // Only non-finalized months
                query = { isFinalized: false };
                break;
            case 'all':
            default:
                // All months
                query = {};
                break;
        }

        const updateFields = {};
        if (lunchRate !== undefined) updateFields.lunchRate = lunchRate;
        if (dinnerRate !== undefined) updateFields.dinnerRate = dinnerRate;
        updateFields.modifiedBy = req.user._id;

        const result = await MonthSettings.updateMany(query, { $set: updateFields });

        res.json({
            message: 'মিল রেট সফলভাবে আপডেট হয়েছে',
            updatedCount: result.modifiedCount,
            appliedTo: applyTo,
            newRates: {
                lunchRate: lunchRate !== undefined ? lunchRate : 'অপরিবর্তিত',
                dinnerRate: dinnerRate !== undefined ? dinnerRate : 'অপরিবর্তিত'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Soft Delete / Restore ====================

// @route   PUT /api/super-admin/users/:id/soft-delete
// @desc    Soft delete a user (mark as deleted but keep data)
// @access  Private (SuperAdmin)
router.put('/users/:id/soft-delete', protect, isSuperAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'সুপার এডমিন সফট ডিলিট করা যাবে না' });
        }

        if (user.isDeleted) {
            return res.status(400).json({ message: 'এই ইউজার আগেই ডিলিট করা হয়েছে' });
        }

        user.isDeleted = true;
        user.deletedAt = new Date();
        user.deletedBy = req.user._id;
        user.deletedReason = reason || 'কোনো কারণ উল্লেখ করা হয়নি';
        user.isActive = false;
        await user.save();

        res.json({
            message: 'ইউজার সফট ডিলিট হয়েছে',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isDeleted: true,
                deletedAt: user.deletedAt
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/users/:id/restore
// @desc    Restore a soft-deleted user
// @access  Private (SuperAdmin)
router.put('/users/:id/restore', protect, isSuperAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        if (!user.isDeleted) {
            return res.status(400).json({ message: 'এই ইউজার ডিলিট করা নয়' });
        }

        user.isDeleted = false;
        user.deletedAt = null;
        user.deletedBy = null;
        user.deletedReason = '';
        user.isActive = true;
        user.restoredAt = new Date();
        user.restoredBy = req.user._id;
        await user.save();

        res.json({
            message: 'ইউজার রিস্টোর হয়েছে',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isActive: true
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/super-admin/users/deleted
// @desc    Get all soft-deleted users
// @access  Private (SuperAdmin)
router.get('/users/deleted', protect, isSuperAdmin, async (req, res) => {
    try {
        const deletedUsers = await User.find({ isDeleted: true })
            .select('-password')
            .populate('deletedBy', 'name email')
            .sort({ deletedAt: -1 });

        res.json(deletedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/super-admin/users/:id/permanent
// @desc    Permanently delete a user and all their data
// @access  Private (SuperAdmin)
router.delete('/users/:id/permanent', protect, isSuperAdmin, async (req, res) => {
    try {
        const { confirmDelete } = req.body;

        if (confirmDelete !== 'PERMANENTLY_DELETE') {
            return res.status(400).json({
                message: 'স্থায়ী ডিলিটের জন্য confirmDelete: "PERMANENTLY_DELETE" পাঠাতে হবে'
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        if (user.role === 'superadmin') {
            return res.status(403).json({ message: 'সুপার এডমিন ডিলিট করা যাবে না' });
        }

        // Delete related data
        const deletedData = {
            transactions: await Transaction.deleteMany({ user: user._id }),
            meals: await Meal.deleteMany({ user: user._id }),
            auditLogs: await MealAuditLog.deleteMany({ user: user._id })
        };

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.json({
            message: 'ইউজার এবং তার সকল ডাটা স্থায়ীভাবে ডিলিট হয়েছে',
            deletedUser: {
                name: user.name,
                email: user.email
            },
            deletedData: {
                transactions: deletedData.transactions.deletedCount,
                meals: deletedData.meals.deletedCount,
                auditLogs: deletedData.auditLogs.deletedCount
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Data Correction Tools ====================

// @route   PUT /api/super-admin/transactions/:id/correct
// @desc    Correct a transaction record
// @access  Private (SuperAdmin)
router.put('/transactions/:id/correct', protect, isSuperAdmin, [
    body('amount').optional().isNumeric().withMessage('পরিমাণ সংখ্যা হতে হবে'),
    body('description').optional().isString(),
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { amount, description, balanceType, reason } = req.body;

        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'ট্রানজ্যাকশন পাওয়া যায়নি' });
        }

        // Store original values
        const originalValues = {
            amount: transaction.amount,
            description: transaction.description,
            balanceType: transaction.balanceType
        };

        // Update transaction
        if (amount !== undefined) transaction.amount = amount;
        if (description !== undefined) transaction.description = description;
        if (balanceType !== undefined) transaction.balanceType = balanceType;

        // Add correction metadata
        if (!transaction.corrections) transaction.corrections = [];
        transaction.corrections.push({
            correctedAt: new Date(),
            correctedBy: req.user._id,
            reason,
            originalValues,
            newValues: { amount, description, balanceType }
        });

        transaction.lastCorrectedAt = new Date();
        transaction.lastCorrectedBy = req.user._id;

        await transaction.save();

        // Recalculate user balance if amount changed
        if (amount !== undefined && amount !== originalValues.amount) {
            const user = await User.findById(transaction.user);
            if (user) {
                const balanceChange = amount - originalValues.amount;
                user.balances[transaction.balanceType].amount += balanceChange;
                await user.save();
            }
        }

        res.json({
            message: 'ট্রানজ্যাকশন সংশোধন হয়েছে',
            transaction,
            correction: {
                originalValues,
                newValues: { amount, description, balanceType },
                reason
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/users/:id/balance-correction
// @desc    Directly correct user balance (emergency use)
// @access  Private (SuperAdmin)
router.put('/users/:id/balance-correction', protect, isSuperAdmin, [
    body('balanceType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('অবৈধ ব্যালেন্স টাইপ'),
    body('newAmount').isNumeric().withMessage('নতুন পরিমাণ সংখ্যা হতে হবে'),
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { balanceType, newAmount, reason } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        const previousBalance = user.balances[balanceType].amount;
        const adjustmentAmount = newAmount - previousBalance;

        // Update balance
        user.balances[balanceType].amount = newAmount;
        await user.save();

        // Create correction transaction
        await Transaction.create({
            user: user._id,
            type: 'adjustment',
            balanceType,
            amount: adjustmentAmount,
            previousBalance,
            newBalance: newAmount,
            description: `সুপার এডমিন সংশোধন: ${reason}`,
            performedBy: req.user._id,
            isCorrection: true,
            correctionReason: reason
        });

        res.json({
            message: 'ব্যালেন্স সংশোধন হয়েছে',
            user: {
                _id: user._id,
                name: user.name
            },
            correction: {
                balanceType,
                previousBalance,
                newBalance: newAmount,
                adjustment: adjustmentAmount,
                reason
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Force Override Endpoints ====================

// @route   PUT /api/super-admin/month-settings/:id/force-update
// @desc    Force update finalized month settings (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/month-settings/:id/force-update', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { lunchRate, dinnerRate, startDate, endDate, notes, reason } = req.body;

        const settings = await MonthSettings.findById(req.params.id);
        if (!settings) {
            return res.status(404).json({ message: 'মাসের সেটিংস পাওয়া যায়নি' });
        }

        // Store original values for audit
        const originalValues = {
            lunchRate: settings.lunchRate,
            dinnerRate: settings.dinnerRate,
            startDate: settings.startDate,
            endDate: settings.endDate,
            notes: settings.notes,
            isFinalized: settings.isFinalized
        };

        // Update fields
        if (lunchRate !== undefined) settings.lunchRate = lunchRate;
        if (dinnerRate !== undefined) settings.dinnerRate = dinnerRate;
        if (startDate !== undefined) settings.startDate = new Date(startDate);
        if (endDate !== undefined) settings.endDate = new Date(endDate);
        if (notes !== undefined) settings.notes = notes;

        // Add force update history
        if (!settings.forceUpdates) settings.forceUpdates = [];
        settings.forceUpdates.push({
            updatedAt: new Date(),
            updatedBy: req.user._id,
            reason,
            originalValues,
            newValues: { lunchRate, dinnerRate, startDate, endDate, notes }
        });

        settings.modifiedBy = req.user._id;
        settings.lastForceUpdatedAt = new Date();
        settings.lastForceUpdatedBy = req.user._id;

        await settings.save();

        // Log audit
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_UPDATE_MONTH_SETTINGS',
            resource: 'MonthSettings',
            resourceId: settings._id,
            details: {
                year: settings.year,
                month: settings.month,
                originalValues,
                newValues: { lunchRate, dinnerRate, startDate, endDate, notes },
                reason,
                wasFinalized: originalValues.isFinalized
            },
            ip: req.ip
        });

        res.json({
            message: 'মাসের সেটিংস জোর করে আপডেট করা হয়েছে',
            settings,
            correction: {
                originalValues,
                reason
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/month-settings/:id/force-unfinalize
// @desc    Force unfinalize a month (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/month-settings/:id/force-unfinalize', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reason } = req.body;

        const settings = await MonthSettings.findById(req.params.id);
        if (!settings) {
            return res.status(404).json({ message: 'মাসের সেটিংস পাওয়া যায়নি' });
        }

        if (!settings.isFinalized) {
            return res.status(400).json({ message: 'এই মাস আগে থেকেই আনফাইনালাইজড' });
        }

        const originalState = {
            isFinalized: settings.isFinalized,
            isCarriedForward: settings.isCarriedForward
        };

        settings.isFinalized = false;
        settings.modifiedBy = req.user._id;

        // Add to force updates history
        if (!settings.forceUpdates) settings.forceUpdates = [];
        settings.forceUpdates.push({
            updatedAt: new Date(),
            updatedBy: req.user._id,
            reason,
            action: 'FORCE_UNFINALIZE',
            originalValues: originalState
        });

        await settings.save();

        // Log audit
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_UNFINALIZE_MONTH',
            resource: 'MonthSettings',
            resourceId: settings._id,
            details: {
                year: settings.year,
                month: settings.month,
                reason,
                previousState: originalState
            },
            ip: req.ip
        });

        res.json({
            message: 'মাস জোর করে আনফাইনালাইজ করা হয়েছে',
            settings,
            previousState: originalState,
            reason
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/breakfast/:id/force-update
// @desc    Force update finalized breakfast (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/breakfast/:id/force-update', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { totalCost, description, participants, reason } = req.body;

        const breakfast = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তা রেকর্ড পাওয়া যায়নি' });
        }

        // Store original values
        const originalValues = {
            totalCost: breakfast.totalCost,
            description: breakfast.description,
            participantCount: breakfast.participants.length,
            isFinalized: breakfast.isFinalized
        };

        // Update fields
        if (totalCost !== undefined) breakfast.totalCost = totalCost;
        if (description !== undefined) breakfast.description = description;
        if (participants !== undefined) breakfast.participants = participants;

        // Add force update history
        if (!breakfast.forceUpdates) breakfast.forceUpdates = [];
        breakfast.forceUpdates.push({
            updatedAt: new Date(),
            updatedBy: req.user._id,
            reason,
            originalValues
        });

        breakfast.lastForceUpdatedAt = new Date();
        breakfast.lastForceUpdatedBy = req.user._id;

        await breakfast.save();

        // Log audit
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_UPDATE_BREAKFAST',
            resource: 'Breakfast',
            resourceId: breakfast._id,
            details: {
                date: breakfast.date,
                originalValues,
                reason,
                wasFinalized: originalValues.isFinalized
            },
            ip: req.ip
        });

        res.json({
            message: 'নাস্তা জোর করে আপডেট করা হয়েছে',
            breakfast,
            correction: {
                originalValues,
                reason
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/breakfast/:id/force-unfinalize
// @desc    Force unfinalize breakfast (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/breakfast/:id/force-unfinalize', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reason } = req.body;

        const breakfast = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তা রেকর্ড পাওয়া যায়নি' });
        }

        if (!breakfast.isFinalized) {
            return res.status(400).json({ message: 'এই নাস্তা আগে থেকেই আনফাইনালাইজড' });
        }

        const originalState = {
            isFinalized: breakfast.isFinalized,
            isDeducted: breakfast.isDeducted
        };

        breakfast.isFinalized = false;

        // Add to force updates history
        if (!breakfast.forceUpdates) breakfast.forceUpdates = [];
        breakfast.forceUpdates.push({
            updatedAt: new Date(),
            updatedBy: req.user._id,
            reason,
            action: 'FORCE_UNFINALIZE',
            originalValues: originalState
        });

        await breakfast.save();

        // Log audit
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_UNFINALIZE_BREAKFAST',
            resource: 'Breakfast',
            resourceId: breakfast._id,
            details: {
                date: breakfast.date,
                reason,
                previousState: originalState
            },
            ip: req.ip
        });

        res.json({
            message: 'নাস্তা জোর করে আনফাইনালাইজ করা হয়েছে',
            breakfast,
            previousState: originalState,
            reason
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/super-admin/corrections/history
// @desc    Get all force corrections/overrides history
// @access  Private (SuperAdmin)
router.get('/corrections/history', protect, isSuperAdmin, async (req, res) => {
    try {
        const { type, limit = 50, skip = 0 } = req.query;

        const AuditLog = require('../models/AuditLog');

        let actions = [
            'FORCE_UPDATE_MONTH_SETTINGS',
            'FORCE_UNFINALIZE_MONTH',
            'FORCE_UPDATE_BREAKFAST',
            'FORCE_UNFINALIZE_BREAKFAST'
        ];

        if (type === 'month') {
            actions = ['FORCE_UPDATE_MONTH_SETTINGS', 'FORCE_UNFINALIZE_MONTH'];
        } else if (type === 'breakfast') {
            actions = ['FORCE_UPDATE_BREAKFAST', 'FORCE_UNFINALIZE_BREAKFAST'];
        }

        const history = await AuditLog.find({ action: { $in: actions } })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await AuditLog.countDocuments({ action: { $in: actions } });

        res.json({
            history,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Database Maintenance ====================

// @route   GET /api/super-admin/db/stats
// @desc    Get database statistics
// @access  Private (SuperAdmin)
router.get('/db/stats', protect, isSuperAdmin, async (req, res) => {
    try {
        const stats = {
            users: {
                total: await User.countDocuments(),
                active: await User.countDocuments({ isActive: true }),
                inactive: await User.countDocuments({ isActive: false }),
                deleted: await User.countDocuments({ isDeleted: true }),
                byRole: {
                    user: await User.countDocuments({ role: 'user' }),
                    manager: await User.countDocuments({ role: 'manager' }),
                    admin: await User.countDocuments({ role: 'admin' }),
                    superadmin: await User.countDocuments({ role: 'superadmin' })
                }
            },
            transactions: {
                total: await Transaction.countDocuments(),
                byType: {
                    deposit: await Transaction.countDocuments({ type: 'deposit' }),
                    deduction: await Transaction.countDocuments({ type: 'deduction' }),
                    adjustment: await Transaction.countDocuments({ type: 'adjustment' }),
                    refund: await Transaction.countDocuments({ type: 'refund' }),
                    reversal: await Transaction.countDocuments({ type: 'reversal' })
                },
                reversed: await Transaction.countDocuments({ isReversed: true })
            },
            meals: {
                total: await Meal.countDocuments(),
                byType: {
                    lunch: await Meal.countDocuments({ mealType: 'lunch' }),
                    dinner: await Meal.countDocuments({ mealType: 'dinner' })
                }
            },
            monthSettings: {
                total: await MonthSettings.countDocuments(),
                finalized: await MonthSettings.countDocuments({ isFinalized: true }),
                carriedForward: await MonthSettings.countDocuments({ isCarriedForward: true })
            },
            breakfasts: {
                total: await Breakfast.countDocuments(),
                finalized: await Breakfast.countDocuments({ isFinalized: true })
            }
        };

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/db/cleanup-orphans
// @desc    Find and optionally clean orphan records
// @access  Private (SuperAdmin)
router.post('/db/cleanup-orphans', protect, isSuperAdmin, async (req, res) => {
    try {
        const { dryRun = true } = req.body;

        // Get all valid user IDs
        const validUserIds = (await User.find().select('_id')).map(u => u._id.toString());

        // Find orphan transactions
        const orphanTransactions = await Transaction.find({
            user: { $nin: validUserIds.map(id => new mongoose.Types.ObjectId(id)) }
        });

        // Find orphan meals
        const orphanMeals = await Meal.find({
            user: { $nin: validUserIds.map(id => new mongoose.Types.ObjectId(id)) }
        });

        // Find orphan audit logs
        const orphanAuditLogs = await MealAuditLog.find({
            user: { $nin: validUserIds.map(id => new mongoose.Types.ObjectId(id)) }
        });

        const orphanCounts = {
            transactions: orphanTransactions.length,
            meals: orphanMeals.length,
            auditLogs: orphanAuditLogs.length
        };

        if (!dryRun && (orphanCounts.transactions > 0 || orphanCounts.meals > 0 || orphanCounts.auditLogs > 0)) {
            // Actually delete orphans
            const deleteResults = {
                transactions: await Transaction.deleteMany({
                    user: { $nin: validUserIds.map(id => new mongoose.Types.ObjectId(id)) }
                }),
                meals: await Meal.deleteMany({
                    user: { $nin: validUserIds.map(id => new mongoose.Types.ObjectId(id)) }
                }),
                auditLogs: await MealAuditLog.deleteMany({
                    user: { $nin: validUserIds.map(id => new mongoose.Types.ObjectId(id)) }
                })
            };

            return res.json({
                message: 'অরফান রেকর্ড ক্লিনআপ সম্পন্ন',
                dryRun: false,
                deleted: {
                    transactions: deleteResults.transactions.deletedCount,
                    meals: deleteResults.meals.deletedCount,
                    auditLogs: deleteResults.auditLogs.deletedCount
                }
            });
        }

        res.json({
            message: dryRun ? 'ড্রাই রান - কিছু ডিলিট হয়নি' : 'কোনো অরফান রেকর্ড নেই',
            dryRun,
            orphanCounts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/db/cleanup-old-data
// @desc    Clean up old data (audit logs, etc.)
// @access  Private (SuperAdmin)
router.post('/db/cleanup-old-data', protect, isSuperAdmin, [
    body('olderThanDays').isInt({ min: 30 }).withMessage('কমপক্ষে ৩০ দিন পুরোনো ডাটা ক্লিনআপ করতে হবে'),
    body('dataTypes').isArray().withMessage('ডাটা টাইপ অ্যারে হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { olderThanDays, dataTypes, dryRun = true } = req.body;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const results = {};

        if (dataTypes.includes('auditLogs')) {
            if (dryRun) {
                results.auditLogs = await MealAuditLog.countDocuments({
                    createdAt: { $lt: cutoffDate }
                });
            } else {
                const deleted = await MealAuditLog.deleteMany({
                    createdAt: { $lt: cutoffDate }
                });
                results.auditLogs = deleted.deletedCount;
            }
        }

        res.json({
            message: dryRun ? 'ড্রাই রান সম্পন্ন' : 'ক্লিনআপ সম্পন্ন',
            dryRun,
            olderThanDays,
            cutoffDate,
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/db/recalculate-all-balances
// @desc    Recalculate all user balances from transactions
// @access  Private (SuperAdmin)
router.post('/db/recalculate-all-balances', protect, isSuperAdmin, async (req, res) => {
    try {
        const { dryRun = true } = req.body;

        const users = await User.find({ isDeleted: { $ne: true } });
        const results = [];

        for (const user of users) {
            const calculatedBalances = {
                breakfast: 0,
                lunch: 0,
                dinner: 0
            };

            // Sum all transactions for each balance type
            for (const balanceType of ['breakfast', 'lunch', 'dinner']) {
                const transactions = await Transaction.find({
                    user: user._id,
                    balanceType
                });

                calculatedBalances[balanceType] = transactions.reduce((sum, t) => sum + t.amount, 0);
            }

            const currentBalances = {
                breakfast: user.balances.breakfast.amount,
                lunch: user.balances.lunch.amount,
                dinner: user.balances.dinner.amount
            };

            const differences = {
                breakfast: calculatedBalances.breakfast - currentBalances.breakfast,
                lunch: calculatedBalances.lunch - currentBalances.lunch,
                dinner: calculatedBalances.dinner - currentBalances.dinner
            };

            const hasDifference = differences.breakfast !== 0 ||
                                  differences.lunch !== 0 ||
                                  differences.dinner !== 0;

            if (hasDifference) {
                results.push({
                    userId: user._id,
                    userName: user.name,
                    currentBalances,
                    calculatedBalances,
                    differences
                });

                if (!dryRun) {
                    user.balances.breakfast.amount = calculatedBalances.breakfast;
                    user.balances.lunch.amount = calculatedBalances.lunch;
                    user.balances.dinner.amount = calculatedBalances.dinner;
                    await user.save();
                }
            }
        }

        res.json({
            message: dryRun ? 'ড্রাই রান সম্পন্ন' : 'ব্যালেন্স রিক্যালকুলেট সম্পন্ন',
            dryRun,
            totalUsers: users.length,
            usersWithDifferences: results.length,
            details: results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Universal Data Edit ====================

const Holiday = require('../models/Holiday');
const Group = require('../models/Group');

// @route   PUT /api/super-admin/meals/:id/force-edit
// @desc    Force edit any meal record (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/meals/:id/force-edit', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { isOn, count, mealType, reason } = req.body;

        const meal = await Meal.findById(req.params.id).populate('user', 'name email');
        if (!meal) {
            return res.status(404).json({ message: 'মিল রেকর্ড পাওয়া যায়নি' });
        }

        const originalValues = {
            isOn: meal.isOn,
            count: meal.count,
            mealType: meal.mealType,
            date: meal.date,
            user: meal.user?.name
        };

        if (isOn !== undefined) meal.isOn = isOn;
        if (count !== undefined) meal.count = count;
        if (mealType !== undefined) meal.mealType = mealType;

        meal.lastModifiedBy = req.user._id;
        meal.lastModifiedAt = new Date();

        await meal.save();

        // Log to MealAuditLog
        await MealAuditLog.create({
            user: meal.user._id,
            meal: meal._id,
            date: meal.date,
            mealType: meal.mealType,
            action: 'SUPERADMIN_FORCE_EDIT',
            previousValue: originalValues,
            newValue: { isOn, count, mealType },
            changedBy: req.user._id,
            reason
        });

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_EDIT_MEAL',
            resource: 'Meal',
            resourceId: meal._id,
            details: {
                mealUser: meal.user?.name,
                date: meal.date,
                originalValues,
                newValues: { isOn, count, mealType },
                reason
            },
            ip: req.ip
        });

        res.json({
            message: 'মিল রেকর্ড সফলভাবে সম্পাদনা করা হয়েছে',
            meal,
            correction: { originalValues, reason }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/super-admin/meals/:id/force-delete
// @desc    Force delete any meal record (SuperAdmin only)
// @access  Private (SuperAdmin)
router.delete('/meals/:id/force-delete', protect, isSuperAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'কারণ আবশ্যক' });
        }

        const meal = await Meal.findById(req.params.id).populate('user', 'name email');
        if (!meal) {
            return res.status(404).json({ message: 'মিল রেকর্ড পাওয়া যায়নি' });
        }

        const mealData = {
            user: meal.user?.name,
            date: meal.date,
            mealType: meal.mealType,
            isOn: meal.isOn,
            count: meal.count
        };

        await meal.deleteOne();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_DELETE_MEAL',
            resource: 'Meal',
            resourceId: req.params.id,
            details: { deletedMeal: mealData, reason },
            ip: req.ip
        });

        res.json({
            message: 'মিল রেকর্ড স্থায়ীভাবে মুছে ফেলা হয়েছে',
            deletedMeal: mealData,
            reason
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/holidays/:id/force-edit
// @desc    Force edit any holiday record (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/holidays/:id/force-edit', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, nameEn, date, type, isRecurring, description, reason } = req.body;

        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'ছুটি পাওয়া যায়নি' });
        }

        const originalValues = {
            name: holiday.name,
            nameEn: holiday.nameEn,
            date: holiday.date,
            type: holiday.type,
            isRecurring: holiday.isRecurring,
            description: holiday.description
        };

        if (name !== undefined) holiday.name = name;
        if (nameEn !== undefined) holiday.nameEn = nameEn;
        if (date !== undefined) holiday.date = new Date(date);
        if (type !== undefined) holiday.type = type;
        if (isRecurring !== undefined) holiday.isRecurring = isRecurring;
        if (description !== undefined) holiday.description = description;

        holiday.modifiedBy = req.user._id;
        holiday.lastModifiedAt = new Date();

        await holiday.save();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_EDIT_HOLIDAY',
            resource: 'Holiday',
            resourceId: holiday._id,
            details: {
                holidayName: holiday.name,
                originalValues,
                newValues: { name, nameEn, date, type, isRecurring, description },
                reason
            },
            ip: req.ip
        });

        res.json({
            message: 'ছুটি সফলভাবে সম্পাদনা করা হয়েছে',
            holiday,
            correction: { originalValues, reason }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/super-admin/holidays/:id/force-delete
// @desc    Force delete any holiday record (SuperAdmin only)
// @access  Private (SuperAdmin)
router.delete('/holidays/:id/force-delete', protect, isSuperAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'কারণ আবশ্যক' });
        }

        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'ছুটি পাওয়া যায়নি' });
        }

        const holidayData = {
            name: holiday.name,
            nameEn: holiday.nameEn,
            date: holiday.date,
            type: holiday.type
        };

        await holiday.deleteOne();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_DELETE_HOLIDAY',
            resource: 'Holiday',
            resourceId: req.params.id,
            details: { deletedHoliday: holidayData, reason },
            ip: req.ip
        });

        res.json({
            message: 'ছুটি স্থায়ীভাবে মুছে ফেলা হয়েছে',
            deletedHoliday: holidayData,
            reason
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/groups/:id/force-edit
// @desc    Force edit any group record (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/groups/:id/force-edit', protect, isSuperAdmin, [
    body('reason').notEmpty().withMessage('কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, manager, members, isActive, reason } = req.body;

        const group = await Group.findById(req.params.id).populate('manager', 'name').populate('members', 'name');
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        const originalValues = {
            name: group.name,
            description: group.description,
            manager: group.manager?.name,
            memberCount: group.members?.length,
            isActive: group.isActive
        };

        if (name !== undefined) group.name = name;
        if (description !== undefined) group.description = description;
        if (manager !== undefined) group.manager = manager;
        if (members !== undefined) group.members = members;
        if (isActive !== undefined) group.isActive = isActive;

        group.modifiedBy = req.user._id;
        group.lastModifiedAt = new Date();

        await group.save();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'FORCE_EDIT_GROUP',
            resource: 'Group',
            resourceId: group._id,
            details: {
                groupName: group.name,
                originalValues,
                reason
            },
            ip: req.ip
        });

        res.json({
            message: 'গ্রুপ সফলভাবে সম্পাদনা করা হয়েছে',
            group,
            correction: { originalValues, reason }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Advanced Recalculation ====================

// @route   POST /api/super-admin/users/:id/recalculate-balance
// @desc    Recalculate balance for a specific user (SuperAdmin only)
// @access  Private (SuperAdmin)
router.post('/users/:id/recalculate-balance', protect, isSuperAdmin, async (req, res) => {
    try {
        const { dryRun = true, balanceType } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        const balanceTypes = balanceType ? [balanceType] : ['breakfast', 'lunch', 'dinner'];
        const results = {};

        for (const type of balanceTypes) {
            const transactions = await Transaction.find({
                user: user._id,
                balanceType: type
            });

            const calculatedBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
            const currentBalance = user.balances[type].amount;
            const difference = calculatedBalance - currentBalance;

            results[type] = {
                current: currentBalance,
                calculated: calculatedBalance,
                difference,
                transactionCount: transactions.length
            };

            if (!dryRun && difference !== 0) {
                user.balances[type].amount = calculatedBalance;
            }
        }

        if (!dryRun) {
            await user.save();

            // Log to AuditLog
            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
                user: req.user._id,
                action: 'RECALCULATE_USER_BALANCE',
                resource: 'User',
                resourceId: user._id,
                details: {
                    userName: user.name,
                    results,
                    dryRun
                },
                ip: req.ip
            });
        }

        res.json({
            message: dryRun ? 'ড্রাই রান সম্পন্ন' : 'ব্যালেন্স রিক্যালকুলেট সম্পন্ন',
            dryRun,
            user: { id: user._id, name: user.name },
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/recalculate-meal-costs
// @desc    Recalculate meal costs for a month after rate change (SuperAdmin only)
// @access  Private (SuperAdmin)
router.post('/recalculate-meal-costs', protect, isSuperAdmin, async (req, res) => {
    try {
        const { year, month, dryRun = true, reason } = req.body;

        if (!year || !month) {
            return res.status(400).json({ message: 'বছর এবং মাস আবশ্যক' });
        }

        const monthSettings = await MonthSettings.findOne({ year, month });
        if (!monthSettings) {
            return res.status(404).json({ message: 'মাসের সেটিংস পাওয়া যায়নি' });
        }

        // Get all meals for this month
        const startDate = monthSettings.startDate;
        const endDate = monthSettings.endDate;

        const meals = await Meal.find({
            date: { $gte: startDate, $lte: endDate },
            isOn: true
        }).populate('user', 'name');

        // Get all related transactions
        const mealTransactions = await Transaction.find({
            referenceModel: 'Meal',
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const results = {
            totalMeals: meals.length,
            lunchMeals: meals.filter(m => m.mealType === 'lunch').length,
            dinnerMeals: meals.filter(m => m.mealType === 'dinner').length,
            currentLunchRate: monthSettings.lunchRate,
            currentDinnerRate: monthSettings.dinnerRate,
            affectedTransactions: mealTransactions.length,
            recalculations: []
        };

        // Group by user for summary
        const userMealCounts = {};
        for (const meal of meals) {
            const userId = meal.user._id.toString();
            if (!userMealCounts[userId]) {
                userMealCounts[userId] = {
                    userName: meal.user.name,
                    lunch: 0,
                    dinner: 0
                };
            }
            if (meal.mealType === 'lunch') {
                userMealCounts[userId].lunch += meal.count;
            } else {
                userMealCounts[userId].dinner += meal.count;
            }
        }

        for (const [userId, counts] of Object.entries(userMealCounts)) {
            const expectedLunchCost = counts.lunch * monthSettings.lunchRate;
            const expectedDinnerCost = counts.dinner * (monthSettings.dinnerRate || 0);

            results.recalculations.push({
                userId,
                userName: counts.userName,
                lunchCount: counts.lunch,
                dinnerCount: counts.dinner,
                expectedLunchCost,
                expectedDinnerCost,
                totalExpected: expectedLunchCost + expectedDinnerCost
            });
        }

        if (!dryRun && reason) {
            // Log to AuditLog
            const AuditLog = require('../models/AuditLog');
            await AuditLog.create({
                user: req.user._id,
                action: 'RECALCULATE_MEAL_COSTS',
                resource: 'MonthSettings',
                resourceId: monthSettings._id,
                details: {
                    year,
                    month,
                    results,
                    reason
                },
                ip: req.ip
            });
        }

        res.json({
            message: dryRun ? 'মিল কস্ট রিক্যালকুলেশন প্রিভিউ' : 'মিল কস্ট রিক্যালকুলেট সম্পন্ন',
            dryRun,
            monthSettings: {
                year: monthSettings.year,
                month: monthSettings.month,
                lunchRate: monthSettings.lunchRate,
                dinnerRate: monthSettings.dinnerRate
            },
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/system-reset
// @desc    Reset specific system data (SuperAdmin only - USE WITH EXTREME CAUTION)
// @access  Private (SuperAdmin)
router.post('/system-reset', protect, isSuperAdmin, async (req, res) => {
    try {
        const { resetType, confirmReset, reason } = req.body;

        if (confirmReset !== 'I_UNDERSTAND_THIS_IS_DESTRUCTIVE') {
            return res.status(400).json({
                message: 'নিশ্চিতকরণ টেক্সট সঠিক নয়',
                required: 'confirmReset: "I_UNDERSTAND_THIS_IS_DESTRUCTIVE"'
            });
        }

        if (!reason || reason.length < 10) {
            return res.status(400).json({ message: 'বিস্তারিত কারণ আবশ্যক (কমপক্ষে ১০ অক্ষর)' });
        }

        const results = {};
        const AuditLog = require('../models/AuditLog');

        switch (resetType) {
            case 'test_data':
                // Delete all data created in last 24 hours (for cleaning test data)
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                results.deletedMeals = (await Meal.deleteMany({ createdAt: { $gte: oneDayAgo } })).deletedCount;
                results.deletedTransactions = (await Transaction.deleteMany({ createdAt: { $gte: oneDayAgo } })).deletedCount;
                results.message = 'গত ২৪ ঘণ্টার টেস্ট ডাটা মুছে ফেলা হয়েছে';
                break;

            case 'all_meals':
                results.deletedMeals = (await Meal.deleteMany({})).deletedCount;
                results.deletedMealAuditLogs = (await MealAuditLog.deleteMany({})).deletedCount;
                results.message = 'সকল মিল ডাটা মুছে ফেলা হয়েছে';
                break;

            case 'all_transactions':
                results.deletedTransactions = (await Transaction.deleteMany({})).deletedCount;
                // Reset all user balances
                await User.updateMany({}, {
                    'balances.breakfast.amount': 0,
                    'balances.lunch.amount': 0,
                    'balances.dinner.amount': 0
                });
                results.balancesReset = true;
                results.message = 'সকল লেনদেন মুছে ফেলা হয়েছে এবং ব্যালেন্স রিসেট করা হয়েছে';
                break;

            case 'reset_balances':
                await User.updateMany({}, {
                    'balances.breakfast.amount': 0,
                    'balances.lunch.amount': 0,
                    'balances.dinner.amount': 0
                });
                results.balancesReset = true;
                results.usersAffected = await User.countDocuments();
                results.message = 'সকল ইউজারের ব্যালেন্স রিসেট করা হয়েছে';
                break;

            default:
                return res.status(400).json({
                    message: 'অবৈধ রিসেট টাইপ',
                    validTypes: ['test_data', 'all_meals', 'all_transactions', 'reset_balances']
                });
        }

        // Log this critical action
        await AuditLog.create({
            user: req.user._id,
            action: 'SYSTEM_RESET',
            resource: 'System',
            resourceId: null,
            details: {
                resetType,
                reason,
                results
            },
            ip: req.ip
        });

        res.json({
            message: results.message,
            resetType,
            reason,
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/super-admin/data-summary
// @desc    Get summary of all editable data for Data Control panel
// @access  Private (SuperAdmin)
router.get('/data-summary', protect, isSuperAdmin, async (req, res) => {
    try {
        const summary = {
            meals: {
                total: await Meal.countDocuments(),
                active: await Meal.countDocuments({ isOn: true }),
                lunch: await Meal.countDocuments({ mealType: 'lunch' }),
                dinner: await Meal.countDocuments({ mealType: 'dinner' })
            },
            holidays: {
                total: await Holiday.countDocuments(),
                recurring: await Holiday.countDocuments({ isRecurring: true }),
                byType: {
                    government: await Holiday.countDocuments({ type: 'government' }),
                    optional: await Holiday.countDocuments({ type: 'optional' }),
                    religious: await Holiday.countDocuments({ type: 'religious' })
                }
            },
            groups: {
                total: await Group.countDocuments(),
                active: await Group.countDocuments({ isActive: true })
            },
            transactions: {
                total: await Transaction.countDocuments(),
                corrected: await Transaction.countDocuments({ 'corrections.0': { $exists: true } })
            },
            users: {
                total: await User.countDocuments({ isDeleted: { $ne: true } }),
                deleted: await User.countDocuments({ isDeleted: true })
            }
        };

        res.json(summary);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Maintenance Mode ====================

const GlobalSettings = require('../models/GlobalSettings');

// @route   GET /api/super-admin/maintenance
// @desc    Get maintenance mode status
// @access  Private (SuperAdmin)
router.get('/maintenance', protect, isSuperAdmin, async (req, res) => {
    try {
        const settings = await GlobalSettings.getSettings();
        res.json({
            maintenance: settings.maintenance,
            isActive: settings.maintenance?.isEnabled || false
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/maintenance/enable
// @desc    Enable maintenance mode
// @access  Private (SuperAdmin)
router.put('/maintenance/enable', protect, isSuperAdmin, async (req, res) => {
    try {
        const { message, messageEn, scheduledStart, scheduledEnd, allowedRoles, allowedUsers, reason } = req.body;

        const settings = await GlobalSettings.getSettings();

        settings.maintenance = {
            ...settings.maintenance,
            isEnabled: true,
            message: message || settings.maintenance?.message || 'সিস্টেম রক্ষণাবেক্ষণ চলছে',
            messageEn: messageEn || settings.maintenance?.messageEn || 'System is under maintenance',
            scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
            scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
            allowedRoles: allowedRoles || ['superadmin'],
            allowedUsers: allowedUsers || [],
            enabledBy: req.user._id,
            enabledAt: new Date(),
            reason: reason || ''
        };

        settings.modifiedBy = req.user._id;
        await settings.save();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'ENABLE_MAINTENANCE_MODE',
            resource: 'GlobalSettings',
            resourceId: settings._id,
            details: {
                message,
                scheduledStart,
                scheduledEnd,
                allowedRoles,
                reason
            },
            ip: req.ip
        });

        res.json({
            message: 'মেইনটেন্যান্স মোড চালু করা হয়েছে',
            maintenance: settings.maintenance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/maintenance/disable
// @desc    Disable maintenance mode
// @access  Private (SuperAdmin)
router.put('/maintenance/disable', protect, isSuperAdmin, async (req, res) => {
    try {
        const settings = await GlobalSettings.getSettings();

        const previousState = { ...settings.maintenance };

        settings.maintenance = {
            ...settings.maintenance,
            isEnabled: false,
            scheduledStart: null,
            scheduledEnd: null
        };

        settings.modifiedBy = req.user._id;
        await settings.save();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'DISABLE_MAINTENANCE_MODE',
            resource: 'GlobalSettings',
            resourceId: settings._id,
            details: {
                previousState,
                disabledAt: new Date()
            },
            ip: req.ip
        });

        res.json({
            message: 'মেইনটেন্যান্স মোড বন্ধ করা হয়েছে',
            maintenance: settings.maintenance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/maintenance/schedule
// @desc    Schedule maintenance mode
// @access  Private (SuperAdmin)
router.put('/maintenance/schedule', protect, isSuperAdmin, [
    body('scheduledStart').notEmpty().withMessage('শুরুর সময় আবশ্যক'),
    body('scheduledEnd').notEmpty().withMessage('শেষের সময় আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { message, messageEn, scheduledStart, scheduledEnd, allowedRoles, reason } = req.body;

        const startDate = new Date(scheduledStart);
        const endDate = new Date(scheduledEnd);

        if (endDate <= startDate) {
            return res.status(400).json({ message: 'শেষের সময় শুরুর সময়ের পরে হতে হবে' });
        }

        const settings = await GlobalSettings.getSettings();

        settings.maintenance = {
            ...settings.maintenance,
            isEnabled: true,
            message: message || settings.maintenance?.message,
            messageEn: messageEn || settings.maintenance?.messageEn,
            scheduledStart: startDate,
            scheduledEnd: endDate,
            allowedRoles: allowedRoles || ['superadmin'],
            enabledBy: req.user._id,
            enabledAt: new Date(),
            reason: reason || 'Scheduled maintenance'
        };

        settings.modifiedBy = req.user._id;
        await settings.save();

        // Log to AuditLog
        const AuditLog = require('../models/AuditLog');
        await AuditLog.create({
            user: req.user._id,
            action: 'SCHEDULE_MAINTENANCE_MODE',
            resource: 'GlobalSettings',
            resourceId: settings._id,
            details: {
                scheduledStart: startDate,
                scheduledEnd: endDate,
                reason
            },
            ip: req.ip
        });

        res.json({
            message: 'মেইনটেন্যান্স শিডিউল করা হয়েছে',
            maintenance: settings.maintenance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// ==================== Rate Rules ====================

// @route   GET /api/super-admin/rate-rules
// @desc    Get all rate rules
// @access  Private (SuperAdmin)
router.get('/rate-rules', protect, isSuperAdmin, async (req, res) => {
    try {
        const settings = await GlobalSettings.getSettings();
        res.json({
            enabled: settings.rateRules?.enabled || false,
            rules: settings.rateRules?.rules || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/rate-rules/toggle
// @desc    Enable/Disable rate rules system
// @access  Private (SuperAdmin)
router.put('/rate-rules/toggle', protect, isSuperAdmin, async (req, res) => {
    try {
        const settings = await GlobalSettings.getSettings();

        if (!settings.rateRules) {
            settings.rateRules = { enabled: false, rules: [] };
        }

        settings.rateRules.enabled = !settings.rateRules.enabled;
        settings.modifiedBy = req.user._id;
        await settings.save();

        res.json({
            message: settings.rateRules.enabled ? 'রেট রুলস সিস্টেম চালু হয়েছে' : 'রেট রুলস সিস্টেম বন্ধ হয়েছে',
            enabled: settings.rateRules.enabled
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/rate-rules
// @desc    Add a new rate rule
// @access  Private (SuperAdmin)
router.post('/rate-rules', protect, isSuperAdmin, [
    body('name').notEmpty().withMessage('নাম আবশ্যক'),
    body('conditionType').isIn(['day_of_week', 'date_range', 'holiday', 'user_count', 'special_event']).withMessage('অবৈধ কন্ডিশন টাইপ')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, conditionType, conditionParams, adjustment, validFrom, validUntil, priority } = req.body;

        const settings = await GlobalSettings.getSettings();

        if (!settings.rateRules) {
            settings.rateRules = { enabled: false, rules: [] };
        }

        const newRule = {
            name,
            description,
            isActive: true,
            priority: priority || 0,
            conditionType,
            conditionParams: conditionParams || {},
            adjustment: adjustment || { type: 'fixed', value: 0, applyTo: 'both' },
            validFrom: validFrom ? new Date(validFrom) : null,
            validUntil: validUntil ? new Date(validUntil) : null,
            createdBy: req.user._id,
            createdAt: new Date()
        };

        settings.rateRules.rules.push(newRule);
        settings.modifiedBy = req.user._id;
        await settings.save();

        res.json({
            message: 'রেট রুল যোগ করা হয়েছে',
            rule: newRule,
            totalRules: settings.rateRules.rules.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/super-admin/rate-rules/:index
// @desc    Update a rate rule
// @access  Private (SuperAdmin)
router.put('/rate-rules/:index', protect, isSuperAdmin, async (req, res) => {
    try {
        const index = parseInt(req.params.index);
        const { name, description, isActive, conditionType, conditionParams, adjustment, validFrom, validUntil, priority } = req.body;

        const settings = await GlobalSettings.getSettings();

        if (!settings.rateRules?.rules?.[index]) {
            return res.status(404).json({ message: 'রুল পাওয়া যায়নি' });
        }

        const rule = settings.rateRules.rules[index];

        if (name !== undefined) rule.name = name;
        if (description !== undefined) rule.description = description;
        if (isActive !== undefined) rule.isActive = isActive;
        if (priority !== undefined) rule.priority = priority;
        if (conditionType !== undefined) rule.conditionType = conditionType;
        if (conditionParams !== undefined) rule.conditionParams = conditionParams;
        if (adjustment !== undefined) rule.adjustment = adjustment;
        if (validFrom !== undefined) rule.validFrom = validFrom ? new Date(validFrom) : null;
        if (validUntil !== undefined) rule.validUntil = validUntil ? new Date(validUntil) : null;

        settings.modifiedBy = req.user._id;
        await settings.save();

        res.json({
            message: 'রেট রুল আপডেট হয়েছে',
            rule: settings.rateRules.rules[index]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/super-admin/rate-rules/:index
// @desc    Delete a rate rule
// @access  Private (SuperAdmin)
router.delete('/rate-rules/:index', protect, isSuperAdmin, async (req, res) => {
    try {
        const index = parseInt(req.params.index);

        const settings = await GlobalSettings.getSettings();

        if (!settings.rateRules?.rules?.[index]) {
            return res.status(404).json({ message: 'রুল পাওয়া যায়নি' });
        }

        const deletedRule = settings.rateRules.rules.splice(index, 1)[0];
        settings.modifiedBy = req.user._id;
        await settings.save();

        res.json({
            message: 'রেট রুল মুছে ফেলা হয়েছে',
            deletedRule
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/super-admin/rate-rules/calculate
// @desc    Test rate calculation with rules for a given date
// @access  Private (SuperAdmin)
router.post('/rate-rules/calculate', protect, isSuperAdmin, async (req, res) => {
    try {
        const { date, mealType = 'lunch', userCount } = req.body;

        const settings = await GlobalSettings.getSettings();
        const testDate = date ? new Date(date) : new Date();
        const dayOfWeek = testDate.getDay();

        // Get base rate from MonthSettings or GlobalSettings
        const baseRate = mealType === 'lunch'
            ? (settings.defaultRates?.lunch || 0)
            : (settings.defaultRates?.dinner || 0);

        let finalRate = baseRate;
        const appliedRules = [];

        if (settings.rateRules?.enabled && settings.rateRules?.rules?.length > 0) {
            // Sort rules by priority (higher first)
            const sortedRules = [...settings.rateRules.rules]
                .filter(r => r.isActive)
                .sort((a, b) => (b.priority || 0) - (a.priority || 0));

            for (const rule of sortedRules) {
                // Check validity period
                if (rule.validFrom && testDate < new Date(rule.validFrom)) continue;
                if (rule.validUntil && testDate > new Date(rule.validUntil)) continue;

                // Check meal type applicability
                if (rule.adjustment?.applyTo !== 'both' && rule.adjustment?.applyTo !== mealType) continue;

                // Check condition
                let conditionMet = false;

                switch (rule.conditionType) {
                    case 'day_of_week':
                        conditionMet = rule.conditionParams?.days?.includes(dayOfWeek);
                        break;
                    case 'date_range':
                        const start = rule.conditionParams?.startDate ? new Date(rule.conditionParams.startDate) : null;
                        const end = rule.conditionParams?.endDate ? new Date(rule.conditionParams.endDate) : null;
                        conditionMet = (!start || testDate >= start) && (!end || testDate <= end);
                        break;
                    case 'user_count':
                        if (userCount !== undefined) {
                            const min = rule.conditionParams?.minUsers || 0;
                            const max = rule.conditionParams?.maxUsers || Infinity;
                            conditionMet = userCount >= min && userCount <= max;
                        }
                        break;
                    case 'special_event':
                        // For testing, just check if event name matches
                        conditionMet = !!rule.conditionParams?.eventName;
                        break;
                    default:
                        conditionMet = false;
                }

                if (conditionMet) {
                    // Apply adjustment
                    switch (rule.adjustment?.type) {
                        case 'fixed':
                            finalRate = rule.adjustment.value;
                            break;
                        case 'percentage':
                            finalRate = baseRate * (1 + rule.adjustment.value / 100);
                            break;
                        case 'multiplier':
                            finalRate = baseRate * rule.adjustment.value;
                            break;
                    }

                    appliedRules.push({
                        name: rule.name,
                        adjustment: rule.adjustment,
                        resultingRate: finalRate
                    });
                }
            }
        }

        res.json({
            date: testDate,
            mealType,
            baseRate,
            finalRate: Math.round(finalRate * 100) / 100,
            appliedRules,
            rateRulesEnabled: settings.rateRules?.enabled || false
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
