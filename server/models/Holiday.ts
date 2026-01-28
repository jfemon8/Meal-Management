import mongoose from 'mongoose';
import { IHolidayDocument } from '../types';

// Bangladesh public holidays
const holidaySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    nameBn: {
        type: String,
        required: true
    },
    // Type of holiday
    type: {
        type: String,
        enum: ['government', 'optional', 'religious'],
        default: 'government'
    },
    // Is this a recurring yearly holiday
    isRecurring: {
        type: Boolean,
        default: false
    },
    // For recurring holidays, store month and day
    recurringMonth: {
        type: Number,
        min: 1,
        max: 12
    },
    recurringDay: {
        type: Number,
        min: 1,
        max: 31
    },
    // Is this holiday active
    isActive: {
        type: Boolean,
        default: true
    },
    // Source of this holiday (manual or api)
    source: {
        type: String,
        enum: ['manual', 'api'],
        default: 'manual'
    },
    // Last synced timestamp (for API holidays)
    lastSyncedAt: {
        type: Date,
        default: null
    },
    // Who added this holiday
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
holidaySchema.index({ date: 1 });
holidaySchema.index({ isActive: 1, date: 1 });
holidaySchema.index({ isRecurring: 1, recurringMonth: 1, recurringDay: 1 });
holidaySchema.index({ type: 1, isActive: 1 });
holidaySchema.index({ source: 1, lastSyncedAt: -1 });

export default mongoose.model<IHolidayDocument>('Holiday', holidaySchema);
