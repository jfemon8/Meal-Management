const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Target user
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Notification type
    type: {
        type: String,
        enum: [
            'low_balance',
            'balance_deposit',
            'balance_deduction',
            'month_closing',
            'month_finalized',
            'holiday_added',
            'holiday_updated',
            'holiday_removed',
            'meal_reminder',
            'meal_toggled',
            'account_update',
            'role_changed',
            'system_announcement',
            'report_ready'
        ],
        required: true
    },
    // Title (short)
    title: {
        type: String,
        required: true
    },
    // Message body
    message: {
        type: String,
        required: true
    },
    // Additional data (JSON)
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Priority level
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    // Category for grouping
    category: {
        type: String,
        enum: ['balance', 'meal', 'holiday', 'system', 'account'],
        default: 'system'
    },
    // Read status
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    // Email sent status
    emailSent: {
        type: Boolean,
        default: false
    },
    emailSentAt: {
        type: Date,
        default: null
    },
    // Action URL (optional)
    actionUrl: {
        type: String,
        default: null
    },
    actionText: {
        type: String,
        default: null
    },
    // Expiry (auto-delete after this date)
    expiresAt: {
        type: Date,
        default: null
    },
    // Created by (system or user)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification for a user
notificationSchema.statics.createNotification = async function(userId, type, title, message, options = {}) {
    const notification = await this.create({
        user: userId,
        type,
        title,
        message,
        data: options.data || {},
        priority: options.priority || 'normal',
        category: options.category || 'system',
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        expiresAt: options.expiresAt,
        createdBy: options.createdBy
    });

    return notification;
};

// Static method to create notification for multiple users
notificationSchema.statics.createBulkNotification = async function(userIds, type, title, message, options = {}) {
    const notifications = userIds.map(userId => ({
        user: userId,
        type,
        title,
        message,
        data: options.data || {},
        priority: options.priority || 'normal',
        category: options.category || 'system',
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        expiresAt: options.expiresAt,
        createdBy: options.createdBy
    }));

    return await this.insertMany(notifications);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
    return await this.countDocuments({ user: userId, isRead: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
    return await this.updateMany(
        { user: userId, isRead: false },
        { isRead: true, readAt: new Date() }
    );
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
    this.isRead = true;
    this.readAt = new Date();
    return await this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
