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

module.exports = router;
