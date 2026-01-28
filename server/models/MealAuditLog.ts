import mongoose from 'mongoose';
import { IMealAuditLogDocument } from '../types';

/**
 * Meal Audit Log Model
 * Tracks all meal status changes with full history
 */
const mealAuditLogSchema = new mongoose.Schema({
    // User whose meal was changed
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The date of the meal
    date: {
        type: Date,
        required: true
    },
    // Meal type
    mealType: {
        type: String,
        enum: ['lunch', 'dinner'],
        required: true
    },
    // Action performed
    action: {
        type: String,
        enum: ['toggle_on', 'toggle_off', 'bulk_on', 'bulk_off', 'count_update', 'manager_override'],
        required: true
    },
    // Previous state
    previousState: {
        isOn: Boolean,
        count: Number
    },
    // New state
    newState: {
        isOn: Boolean,
        count: Number
    },
    // Who made the change
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Role of the person who made the change
    changedByRole: {
        type: String,
        enum: ['user', 'manager', 'admin', 'superadmin'],
        required: true
    },
    // Notes/reason for the change
    notes: {
        type: String,
        default: ''
    },
    // IP address (optional)
    ipAddress: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
mealAuditLogSchema.index({ user: 1, date: -1 });
mealAuditLogSchema.index({ changedBy: 1, createdAt: -1 });
mealAuditLogSchema.index({ date: 1, mealType: 1 });
mealAuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IMealAuditLogDocument>('MealAuditLog', mealAuditLogSchema);
