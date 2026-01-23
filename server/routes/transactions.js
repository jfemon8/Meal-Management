const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect, isManager } = require('../middleware/auth');

// @route   GET /api/transactions
// @desc    Get transactions for current user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { balanceType, startDate, endDate, page = 1, limit = 20 } = req.query;

        const query = { user: req.user._id };

        if (balanceType) {
            query.balanceType = balanceType;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Transaction.find(query)
            .populate('performedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/transactions/user/:userId
// @desc    Get transactions for a specific user (Manager+ only)
// @access  Private (Manager+)
router.get('/user/:userId', protect, isManager, async (req, res) => {
    try {
        const { balanceType, startDate, endDate, page = 1, limit = 20 } = req.query;

        const query = { user: req.params.userId };

        if (balanceType) {
            query.balanceType = balanceType;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Transaction.find(query)
            .populate('performedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/transactions/all
// @desc    Get all transactions (Manager+ only)
// @access  Private (Manager+)
router.get('/all', protect, isManager, async (req, res) => {
    try {
        const { balanceType, type, startDate, endDate, page = 1, limit = 50 } = req.query;

        const query = {};

        if (balanceType) {
            query.balanceType = balanceType;
        }

        if (type) {
            query.type = type;
        }

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Transaction.find(query)
            .populate('user', 'name email')
            .populate('performedBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/transactions/:id/reverse
// @desc    Reverse a transaction (Manager+ only)
// @access  Private (Manager+)
router.post('/:id/reverse', protect, isManager, [
    body('reason').notEmpty().withMessage('রিভার্স করার কারণ আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { reason } = req.body;

        // Find the original transaction
        const originalTransaction = await Transaction.findById(req.params.id)
            .populate('user', 'name email balances');

        if (!originalTransaction) {
            return res.status(404).json({ message: 'ট্রান্সাকশন পাওয়া যায়নি' });
        }

        // Check if already reversed
        if (originalTransaction.isReversed) {
            return res.status(400).json({ message: 'এই ট্রান্সাকশন আগেই রিভার্স করা হয়েছে' });
        }

        // Can't reverse a reversal
        if (originalTransaction.type === 'reversal') {
            return res.status(400).json({ message: 'রিভার্সাল ট্রান্সাকশন রিভার্স করা যাবে না' });
        }

        // Get the user
        const user = await User.findById(originalTransaction.user._id);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check if balance is frozen
        const balanceType = originalTransaction.balanceType;
        if (user.balances[balanceType].isFrozen) {
            return res.status(403).json({
                message: `${balanceType} ব্যালেন্স ফ্রিজ করা আছে। রিভার্স করতে আনফ্রিজ করুন।`
            });
        }

        // Calculate reversal amount (opposite of original)
        const reversalAmount = -originalTransaction.amount;
        const previousBalance = user.balances[balanceType].amount;
        const newBalance = previousBalance + reversalAmount;

        // Update user balance
        user.balances[balanceType].amount = newBalance;
        await user.save();

        // Mark original transaction as reversed
        originalTransaction.isReversed = true;
        await originalTransaction.save();

        // Create reversal transaction
        const reversalTransaction = await Transaction.create({
            user: user._id,
            type: 'reversal',
            balanceType,
            amount: reversalAmount,
            previousBalance,
            newBalance,
            description: `রিভার্সাল: ${originalTransaction.description || originalTransaction.type}`,
            originalTransaction: originalTransaction._id,
            reference: originalTransaction._id,
            referenceModel: 'Transaction',
            reversalReason: reason,
            performedBy: req.user._id
        });

        res.json({
            message: 'ট্রান্সাকশন সফলভাবে রিভার্স করা হয়েছে',
            originalTransaction: {
                _id: originalTransaction._id,
                type: originalTransaction.type,
                amount: originalTransaction.amount,
                isReversed: true
            },
            reversalTransaction: {
                _id: reversalTransaction._id,
                type: reversalTransaction.type,
                amount: reversalTransaction.amount,
                reason: reason
            },
            newBalance: user.balances[balanceType].amount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/transactions/:id
// @desc    Get a single transaction (Manager+ only)
// @access  Private (Manager+)
router.get('/:id', protect, isManager, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('user', 'name email')
            .populate('performedBy', 'name email')
            .populate('originalTransaction');

        if (!transaction) {
            return res.status(404).json({ message: 'ট্রান্সাকশন পাওয়া যায়নি' });
        }

        res.json(transaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
