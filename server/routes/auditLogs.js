const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
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

/**
 * @route   GET /api/audit-logs/managers/list
 * @desc    Get list of all managers (system role + group managers)
 * @access  Admin+
 */
router.get('/managers/list', protect, isAdmin, async (req, res) => {
    try {
        // Get users who are either system managers or group managers
        const managers = await User.find({
            $or: [
                { role: 'manager' },
                { isGroupManager: true }
            ],
            isActive: true
        })
        .select('name email role isGroupManager group')
        .populate('group', 'name')
        .lean();

        res.json(managers);
    } catch (error) {
        console.error('Get managers list error:', error);
        res.status(500).json({ message: 'ম্যানেজার লিস্ট লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/managers/activity
 * @desc    Get all managers' activity logs
 * @access  Admin+
 */
router.get('/managers/activity', protect, isAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            managerId,
            category,
            action,
            startDate,
            endDate
        } = req.query;

        // Get all manager user IDs
        let managerIds = [];
        if (managerId) {
            managerIds = [managerId];
        } else {
            const managers = await User.find({
                $or: [
                    { role: 'manager' },
                    { isGroupManager: true }
                ]
            }).select('_id');
            managerIds = managers.map(m => m._id);
        }

        const query = {
            user: { $in: managerIds }
        };

        if (category) query.category = category;
        if (action) query.action = { $regex: action, $options: 'i' };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('user', 'name email role isGroupManager')
            .lean();

        const total = await AuditLog.countDocuments(query);

        res.json({
            logs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get managers activity error:', error);
        res.status(500).json({ message: 'ম্যানেজার অ্যাক্টিভিটি লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/managers/summary
 * @desc    Get managers' activity summary with statistics
 * @access  Admin+
 */
router.get('/managers/summary', protect, isAdmin, async (req, res) => {
    try {
        const { days = 30, managerId } = req.query;

        // Get all manager user IDs
        let managerIds = [];
        if (managerId) {
            managerIds = [managerId];
        } else {
            const managers = await User.find({
                $or: [
                    { role: 'manager' },
                    { isGroupManager: true }
                ]
            }).select('_id');
            managerIds = managers.map(m => m._id);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Get activity breakdown by manager
        const activityByManager = await AuditLog.aggregate([
            {
                $match: {
                    user: { $in: managerIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$user',
                    totalActions: { $sum: 1 },
                    categories: { $push: '$category' },
                    lastActivity: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 1,
                    name: '$userInfo.name',
                    email: '$userInfo.email',
                    role: '$userInfo.role',
                    isGroupManager: '$userInfo.isGroupManager',
                    totalActions: 1,
                    lastActivity: 1,
                    categories: 1
                }
            },
            { $sort: { totalActions: -1 } }
        ]);

        // Process categories count for each manager
        const managersWithStats = activityByManager.map(manager => {
            const categoryCounts = {};
            manager.categories.forEach(cat => {
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            return {
                ...manager,
                categoryCounts,
                categories: undefined
            };
        });

        // Get overall category breakdown
        const categoryBreakdown = await AuditLog.aggregate([
            {
                $match: {
                    user: { $in: managerIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get action breakdown
        const actionBreakdown = await AuditLog.aggregate([
            {
                $match: {
                    user: { $in: managerIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get daily activity trend
        const dailyTrend = await AuditLog.aggregate([
            {
                $match: {
                    user: { $in: managerIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get total counts
        const totalActions = await AuditLog.countDocuments({
            user: { $in: managerIds },
            createdAt: { $gte: startDate }
        });

        const totalManagers = managerIds.length;
        const activeManagers = managersWithStats.length;

        res.json({
            summary: {
                totalActions,
                totalManagers,
                activeManagers,
                period: `${days} দিন`
            },
            managers: managersWithStats,
            categoryBreakdown,
            actionBreakdown,
            dailyTrend
        });
    } catch (error) {
        console.error('Get managers summary error:', error);
        res.status(500).json({ message: 'সামারি লোড করতে সমস্যা হয়েছে' });
    }
});

/**
 * @route   GET /api/audit-logs/managers/:managerId/activity
 * @desc    Get specific manager's activity log
 * @access  Admin+
 */
router.get('/managers/:managerId/activity', protect, isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, category, startDate, endDate } = req.query;

        const manager = await User.findById(req.params.managerId).select('name email role isGroupManager');
        if (!manager) {
            return res.status(404).json({ message: 'ম্যানেজার পাওয়া যায়নি' });
        }

        const query = { user: req.params.managerId };

        if (category) query.category = category;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        const total = await AuditLog.countDocuments(query);

        // Get manager's activity stats
        const stats = await AuditLog.aggregate([
            { $match: { user: manager._id } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            manager,
            logs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            stats
        });
    } catch (error) {
        console.error('Get manager activity error:', error);
        res.status(500).json({ message: 'ম্যানেজার অ্যাক্টিভিটি লোড করতে সমস্যা হয়েছে' });
    }
});

module.exports = router;
