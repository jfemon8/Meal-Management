const mongoose = require('mongoose');

// This model tracks meal on/off status for each user per day (lunch and dinner)
const mealSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    // Meal type - lunch and dinner
    mealType: {
        type: String,
        enum: ['lunch', 'dinner'],
        default: 'lunch'
    },
    // Meal status
    isOn: {
        type: Boolean,
        default: true
    },
    // Number of meals (can be more than 1 for guests)
    count: {
        type: Number,
        default: 1,
        min: 0
    },
    // Who modified this meal status
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Is this a default status or manually set
    isManuallySet: {
        type: Boolean,
        default: false
    },
    // Notes
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
mealSchema.index({ user: 1, date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('Meal', mealSchema);
