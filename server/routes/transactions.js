const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
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

module.exports = router;
