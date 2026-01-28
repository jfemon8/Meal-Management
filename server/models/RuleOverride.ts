import mongoose from 'mongoose';
import { IRuleOverrideDocument } from '../types';

/**
 * Rule Override Model
 * Manages meal ON/OFF overrides with priority levels
 *
 * Priority Hierarchy:
 * 4 = Admin/Superadmin override (highest)
 * 3 = Manager override
 * 2 = User manual toggle
 * 1 = System default (Friday OFF, Odd Saturday OFF, Holidays)
 */
const ruleOverrideSchema = new mongoose.Schema({
    // Target: specific user, all users, or global rule
    targetType: {
        type: String,
        enum: ['user', 'all_users', 'global'],
        required: true
    },
    // Specific user if targetType is 'user'
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Date specification type
    dateType: {
        type: String,
        enum: ['single', 'range', 'recurring'],
        required: true
    },
    // Start date (required for all types)
    startDate: {
        type: Date,
        required: true
    },
    // End date (required for 'range' type)
    endDate: {
        type: Date,
        default: null
    },
    // For recurring rules
    recurringPattern: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', null],
        default: null
    },
    // Days for recurring (0-6 for weekly, 1-31 for monthly)
    recurringDays: [{
        type: Number,
        min: 0,
        max: 31
    }],
    // Meal type affected
    mealType: {
        type: String,
        enum: ['lunch', 'dinner', 'both'],
        required: true
    },
    // Override action
    action: {
        type: String,
        enum: ['force_on', 'force_off'],
        required: true
    },
    // Priority level (higher number = higher priority)
    priority: {
        type: Number,
        enum: [1, 2, 3, 4],
        required: true
    },
    // Role that created this override
    createdByRole: {
        type: String,
        enum: ['system', 'user', 'manager', 'admin', 'superadmin'],
        required: true
    },
    // User who created this override
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Reason for override
    reason: {
        type: String,
        default: ''
    },
    // Bengali reason for display
    reasonBn: {
        type: String,
        default: ''
    },
    // Is this override active
    isActive: {
        type: Boolean,
        default: true
    },
    // Optional expiry date
    expiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
ruleOverrideSchema.index({ startDate: 1, endDate: 1 });
ruleOverrideSchema.index({ targetType: 1, targetUser: 1 });
ruleOverrideSchema.index({ mealType: 1, isActive: 1 });
ruleOverrideSchema.index({ priority: -1 });
ruleOverrideSchema.index({ createdAt: -1 });

// Virtual for checking if override is expired
ruleOverrideSchema.virtual('isExpired').get(function(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

// Method to check if date falls within this override
ruleOverrideSchema.methods.appliesToDate = function(date: Date | string): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Check if expired
    if ((this as any).isExpired) return false;

    // Check if active
    if (!this.isActive) return false;

    switch (this.dateType) {
        case 'single':
            const startD = new Date(this.startDate);
            startD.setHours(0, 0, 0, 0);
            return d.getTime() === startD.getTime();

        case 'range':
            const rangeStart = new Date(this.startDate);
            const rangeEnd = new Date(this.endDate);
            rangeStart.setHours(0, 0, 0, 0);
            rangeEnd.setHours(23, 59, 59, 999);
            return d >= rangeStart && d <= rangeEnd;

        case 'recurring':
            // Check if date is after start date
            const recurStart = new Date(this.startDate);
            recurStart.setHours(0, 0, 0, 0);
            if (d < recurStart) return false;

            if (this.recurringPattern === 'weekly') {
                return this.recurringDays.includes(d.getDay());
            }
            if (this.recurringPattern === 'monthly') {
                return this.recurringDays.includes(d.getDate());
            }
            return false;

        default:
            return false;
    }
};

// Static method to get priority for role
ruleOverrideSchema.statics.getPriorityForRole = function(role: string): number {
    const priorityMap: Record<string, number> = {
        'superadmin': 4,
        'admin': 4,
        'manager': 3,
        'user': 2,
        'system': 1
    };
    return priorityMap[role] || 1;
};

export default mongoose.model<IRuleOverrideDocument>('RuleOverride', ruleOverrideSchema);
