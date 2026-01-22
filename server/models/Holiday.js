const mongoose = require('mongoose');

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
    // Who added this holiday
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient date queries
holidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
