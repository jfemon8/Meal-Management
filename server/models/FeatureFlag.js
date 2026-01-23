const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
    // Unique feature key
    key: {
        type: String,
        required: [true, 'ফিচার কী আবশ্যক'],
        unique: true,
        trim: true,
        lowercase: true
    },
    // Display name
    name: {
        type: String,
        required: [true, 'ফিচার নাম আবশ্যক'],
        trim: true
    },
    // Description
    description: {
        type: String,
        default: ''
    },
    // Is feature enabled globally
    isEnabled: {
        type: Boolean,
        default: false
    },
    // Feature category
    category: {
        type: String,
        enum: ['meal', 'transaction', 'user', 'report', 'notification', 'system', 'experimental'],
        default: 'system'
    },
    // Who can see/use this feature when enabled
    allowedRoles: {
        type: [String],
        enum: ['user', 'manager', 'admin', 'superadmin'],
        default: ['user', 'manager', 'admin', 'superadmin']
    },
    // Specific users who have access (for beta testing)
    allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Percentage rollout (0-100)
    rolloutPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    // Environment specific
    environments: {
        development: {
            type: Boolean,
            default: true
        },
        staging: {
            type: Boolean,
            default: true
        },
        production: {
            type: Boolean,
            default: false
        }
    },
    // Start/End dates for time-limited features
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    // Dependencies on other feature flags
    dependencies: [{
        type: String // feature keys
    }],
    // Configuration options for the feature
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Change history
    history: [{
        action: {
            type: String,
            enum: ['created', 'enabled', 'disabled', 'updated', 'config_changed']
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        },
        previousValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        reason: String
    }]
}, {
    timestamps: true
});

// Check if feature is active for a specific user
featureFlagSchema.methods.isActiveForUser = function(user, environment = 'production') {
    // Check if globally enabled
    if (!this.isEnabled) return false;

    // Check environment
    if (!this.environments[environment]) return false;

    // Check date range
    const now = new Date();
    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;

    // Check if user is in allowed users list (beta users)
    if (this.allowedUsers.length > 0) {
        const userId = user._id ? user._id.toString() : user.toString();
        if (this.allowedUsers.some(u => u.toString() === userId)) {
            return true;
        }
    }

    // Check role
    if (!this.allowedRoles.includes(user.role)) return false;

    // Check rollout percentage
    if (this.rolloutPercentage < 100) {
        const userId = user._id ? user._id.toString() : user.toString();
        const hash = this.hashUserId(userId);
        if (hash > this.rolloutPercentage) return false;
    }

    return true;
};

// Simple hash for consistent rollout
featureFlagSchema.methods.hashUserId = function(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash) % 100;
};

// Static method to get all active features for a user
featureFlagSchema.statics.getActiveFeatures = async function(user, environment = 'production') {
    const flags = await this.find({ isEnabled: true });
    const activeFeatures = {};

    for (const flag of flags) {
        if (flag.isActiveForUser(user, environment)) {
            activeFeatures[flag.key] = {
                name: flag.name,
                config: flag.config
            };
        }
    }

    return activeFeatures;
};

// Static method to check a single feature
featureFlagSchema.statics.isFeatureEnabled = async function(key, user, environment = 'production') {
    const flag = await this.findOne({ key });
    if (!flag) return false;
    return flag.isActiveForUser(user, environment);
};

// Add history entry
featureFlagSchema.methods.addHistory = function(action, changedBy, previousValue, newValue, reason = '') {
    this.history.push({
        action,
        changedBy,
        changedAt: new Date(),
        previousValue,
        newValue,
        reason
    });
};

// Index for efficient queries
featureFlagSchema.index({ key: 1 });
featureFlagSchema.index({ isEnabled: 1, category: 1 });

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
