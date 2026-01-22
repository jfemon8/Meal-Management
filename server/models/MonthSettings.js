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

// Compound index for year and month
monthSettingsSchema.index({ year: 1, month: 1 }, { unique: true });

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
