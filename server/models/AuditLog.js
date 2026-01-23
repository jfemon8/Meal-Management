const mongoose = require('mongoose');

/**
 * General Audit Log Model
 * Tracks all critical system actions for security and accountability
 */
const auditLogSchema = new mongoose.Schema({
    // User who performed the action
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Role at the time of action
    userRole: {
        type: String,
        enum: ['user', 'manager', 'admin', 'superadmin'],
        required: true
    },
    // Action category
    category: {
        type: String,
        enum: [
            'auth',           // Login, logout, password change
            'user',           // User CRUD operations
            'balance',        // Balance deposits, deductions
            'meal',           // Meal toggles (handled by MealAuditLog but summary here)
            'breakfast',      // Breakfast cost submissions
            'settings',       // Month settings, global settings
            'holiday',        // Holiday CRUD
            'report',         // Report generation, exports
            'admin',          // Admin-only operations
            'superadmin',     // Superadmin operations
            'system'          // System-level actions
        ],
        required: true
    },
    // Specific action
    action: {
        type: String,
        required: true,
        // Examples: 'login', 'logout', 'create_user', 'deposit_balance',
        // 'toggle_meal', 'finalize_month', 'restore_user', 'export_csv'
    },
    // Target entity type
    targetModel: {
        type: String,
        enum: ['User', 'Transaction', 'Meal', 'Breakfast', 'MonthSettings',
               'Holiday', 'FeatureFlag', 'GlobalSettings', 'RuleOverride', 'Notification', null],
        default: null
    },
    // Target entity ID
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    // Description of the action (Bengali)
    description: {
        type: String,
        required: true
    },
    // Previous data (for undo capability)
    previousData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // New data after action
    newData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // IP address
    ipAddress: {
        type: String,
        default: ''
    },
    // User agent
    userAgent: {
        type: String,
        default: ''
    },
    // Status of the action
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    // Error message if failed
    errorMessage: {
        type: String,
        default: ''
    },
    // Can this action be undone?
    isReversible: {
        type: Boolean,
        default: false
    },
    // Was this action undone?
    isUndone: {
        type: Boolean,
        default: false
    },
    // Reference to the undo action log
    undoneBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditLog',
        default: null
    },
    // When was it undone
    undoneAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });

/**
 * Create an audit log entry
 */
auditLogSchema.statics.log = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Audit log creation error:', error);
        return null;
    }
};

/**
 * Get logs by user
 */
auditLogSchema.statics.getByUser = async function(userId, options = {}) {
    const { page = 1, limit = 50, category, action, startDate, endDate } = options;

    const query = { user: userId };

    if (category) query.category = category;
    if (action) query.action = action;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await this.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email');

    const total = await this.countDocuments(query);

    return { logs, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Get logs by category
 */
auditLogSchema.statics.getByCategory = async function(category, options = {}) {
    const { page = 1, limit = 50, startDate, endDate } = options;

    const query = { category };

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await this.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email');

    const total = await this.countDocuments(query);

    return { logs, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Get activity summary for dashboard
 */
auditLogSchema.statics.getActivitySummary = async function(options = {}) {
    const { days = 7 } = options;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    category: '$category',
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.date': 1 } }
    ]);

    return summary;
};

/**
 * Get recent critical actions
 */
auditLogSchema.statics.getRecentCritical = async function(limit = 20) {
    const criticalActions = [
        'delete_user', 'restore_user', 'change_role', 'finalize_month',
        'system_rate_update', 'correct_transaction', 'reverse_transaction',
        'cleanup_database', 'reset_balances', 'bulk_operation'
    ];

    return this.find({ action: { $in: criticalActions } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'name email');
};

/**
 * Search logs
 */
auditLogSchema.statics.search = async function(searchTerm, options = {}) {
    const { page = 1, limit = 50 } = options;

    const query = {
        $or: [
            { description: { $regex: searchTerm, $options: 'i' } },
            { action: { $regex: searchTerm, $options: 'i' } }
        ]
    };

    const logs = await this.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name email');

    const total = await this.countDocuments(query);

    return { logs, total, page, pages: Math.ceil(total / limit) };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
