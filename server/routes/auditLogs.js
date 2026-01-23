const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, isAdmin, isSuperAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/audit-logs
 * @desc    Get all audit logs (paginated)
 * @access  Admin+
 */
router.get('/', protect, isAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            category,
            action,
            userId,
            startDate,
            endDate,
            status
        } = req.query;

        const query = {};

        if (category) query.category = category;
        if (action) query.action = { $regex: action, $options: 'i' };
        if (userId) query.user = userId;
        if (status) query.status = status;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('user', 'name email')
            .lean();

        const total = await AuditLog.countDocuments(query);

        res.json({
            logs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ message: 'অডিট লগ লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/categories
 * @desc    Get all unique categories with counts
 * @access  Admin+
 */
router.get('/categories', protect, isAdmin, async (req, res) => {
    try {
        const categories = await AuditLog.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'ক্যাটাগরি লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/actions
 * @desc    Get all unique actions with counts
 * @access  Admin+
 */
router.get('/actions', protect, isAdmin, async (req, res) => {
    try {
        const { category } = req.query;
        const match = category ? { category } : {};

        const actions = await AuditLog.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json(actions);
    } catch (error) {
        console.error('Get actions error:', error);
        res.status(500).json({ message: 'অ্যাকশন লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/summary
 * @desc    Get activity summary for dashboard
 * @access  Admin+
 */
router.get('/summary', protect, isAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const summary = await AuditLog.getActivitySummary({ days: parseInt(days) });

        // Also get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStats = await AuditLog.aggregate([
            { $match: { createdAt: { $gte: today } } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get failed actions count
        const failedCount = await AuditLog.countDocuments({
            status: 'failed',
            createdAt: { $gte: today }
        });

        res.json({
            summary,
            todayStats,
            failedToday: failedCount
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ message: 'সামারি লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/critical
 * @desc    Get recent critical actions
 * @access  SuperAdmin
 */
router.get('/critical', protect, isSuperAdmin, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const logs = await AuditLog.getRecentCritical(parseInt(limit));

        res.json(logs);
    } catch (error) {
        console.error('Get critical logs error:', error);
        res.status(500).json({ message: 'ক্রিটিক্যাল লগ লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/search
 * @desc    Search audit logs
 * @access  Admin+
 */
router.get('/search', protect, isAdmin, async (req, res) => {
    try {
        const { q, page = 1, limit = 50 } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'সার্চ টার্ম প্রদান করুন' });
        }

        const result = await AuditLog.search(q, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(result);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'সার্চ করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/user/:userId
 * @desc    Get audit logs for a specific user
 * @access  Admin+
 */
router.get('/user/:userId', protect, isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, category, action } = req.query;

        const result = await AuditLog.getByUser(req.params.userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            category,
            action
        });

        res.json(result);
    } catch (error) {
        console.error('Get user logs error:', error);
        res.status(500).json({ message: 'ইউজার লগ লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get a single audit log with full details
 * @access  Admin+
 */
router.get('/:id', protect, isAdmin, async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('user', 'name email')
            .populate('undoneBy', 'user createdAt');

        if (!log) {
            return res.status(404).json({ message: 'অডিট লগ পাওয়া যায়নি' });
        }

        res.json(log);
    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({ message: 'অডিট লগ লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/my/history
 * @desc    Get current user's own audit history
 * @access  Protected
 */
router.get('/my/history', protect, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await AuditLog.getByUser(req.user._id, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json(result);
    } catch (error) {
        console.error('Get my history error:', error);
        res.status(500).json({ message: 'আপনার হিস্টোরি লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   POST /api/audit-logs/:id/undo
 * @desc    Mark an action as undone (actual undo logic handled elsewhere)
 * @access  SuperAdmin
 */
router.post('/:id/undo', protect, isSuperAdmin, async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id);

        if (!log) {
            return res.status(404).json({ message: 'অডিট লগ পাওয়া যায়নি' });
        }

        if (!log.isReversible) {
            return res.status(400).json({ message: 'এই অ্যাকশন রিভার্স করা যাবে না' });
        }

        if (log.isUndone) {
            return res.status(400).json({ message: 'এই অ্যাকশন ইতোমধ্যে রিভার্স করা হয়েছে' });
        }

        // Just mark as undone - actual undo logic should be implemented
        // based on the action type in respective services
        log.isUndone = true;
        log.undoneAt = new Date();
        await log.save();

        res.json({
            message: 'অ্যাকশন রিভার্স করা হয়েছে',
            log,
            previousData: log.previousData
        });
    } catch (error) {
        console.error('Undo action error:', error);
        res.status(500).json({ message: 'রিভার্স করতে সমস্যা হয়েছে' });
    }
});

module.exports = router;
