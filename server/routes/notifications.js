const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, isManager, isAdmin } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false, category, type } = req.query;

        const query = { user: req.user._id };
        if (unreadOnly === 'true') query.isRead = false;
        if (category) query.category = category;
        if (type) query.type = type;

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.getUnreadCount(req.user._id);

        res.json({
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            unreadCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
    try {
        const count = await Notification.getUnreadCount(req.user._id);
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'নোটিফিকেশন পাওয়া যায়নি' });
        }

        await notification.markAsRead();

        res.json({ message: 'নোটিফিকেশন পড়া হয়েছে', notification });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
    try {
        const result = await Notification.markAllAsRead(req.user._id);
        res.json({
            message: 'সকল নোটিফিকেশন পড়া হয়েছে',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'নোটিফিকেশন পাওয়া যায়নি' });
        }

        res.json({ message: 'নোটিফিকেশন মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all notifications
// @access  Private
router.delete('/clear-all', protect, async (req, res) => {
    try {
        const { readOnly = false } = req.query;

        const query = { user: req.user._id };
        if (readOnly === 'true') query.isRead = true;

        const result = await Notification.deleteMany(query);

        res.json({
            message: 'নোটিফিকেশন মুছে ফেলা হয়েছে',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/notifications/send
// @desc    Send notification to user(s) (Admin+)
// @access  Private (Admin+)
router.post('/send', protect, isAdmin, async (req, res) => {
    try {
        const { userIds, allUsers, type, title, message, priority, category, actionUrl, actionText } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'টাইটেল এবং মেসেজ আবশ্যক' });
        }

        let targetUserIds = userIds || [];

        if (allUsers) {
            const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');
            targetUserIds = users.map(u => u._id);
        }

        if (targetUserIds.length === 0) {
            return res.status(400).json({ message: 'কোনো ইউজার নির্বাচন করা হয়নি' });
        }

        const notifications = await Notification.createBulkNotification(
            targetUserIds,
            type || 'system_announcement',
            title,
            message,
            {
                priority: priority || 'normal',
                category: category || 'system',
                actionUrl,
                actionText,
                createdBy: req.user._id
            }
        );

        res.status(201).json({
            message: 'নোটিফিকেশন পাঠানো হয়েছে',
            count: notifications.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/notifications/admin/all
// @desc    Get all notifications (Admin+ for monitoring)
// @access  Private (Admin+)
router.get('/admin/all', protect, isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, type, category, userId } = req.query;

        const query = {};
        if (type) query.type = type;
        if (category) query.category = category;
        if (userId) query.user = userId;

        const notifications = await Notification.find(query)
            .populate('user', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(query);

        res.json({
            notifications,
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
