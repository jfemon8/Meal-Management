const mongoose = require('mongoose');

// Monthly settings for meal rate and date range
const monthSettingsSchema = new mongoose.Schema({
    // Year and month
    year: {
        type: Number,
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    // Custom start date (default: 1st of month)
    startDate: {
        type: Date,
        required: true
    },
    // Custom end date (default: last day of month)
    endDate: {
        type: Date,
        required: true
    },
    // Meal rates
    lunchRate: {
        type: Number,
        required: true,
        min: 0
    },
    dinnerRate: {
        type: Number,
        default: 0,
        min: 0
    },
    // Is this month finalized (calculations complete)
    isFinalized: {
        type: Boolean,
        default: false
    },
    // Carry forward status
    isCarriedForward: {
        type: Boolean,
        default: false
    },
    carriedForwardAt: {
        type: Date,
        default: null
    },
    carriedForwardBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Who created/modified this setting
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Notes
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
monthSettingsSchema.index({ year: 1, month: 1 }, { unique: true });
monthSettingsSchema.index({ isFinalized: 1 });
monthSettingsSchema.index({ startDate: 1, endDate: 1 });
monthSettingsSchema.index({ isCarriedForward: 1, carriedForwardAt: -1 });

// Validate that date range doesn't exceed 31 days
monthSettingsSchema.pre('save', function (next) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 31) {
        return next(new Error('মাসের রেঞ্জ সর্বোচ্চ ৩১ দিন হতে পারবে'));
    }
    next();
});

module.exports = mongoose.model('MonthSettings', monthSettingsSchema);
