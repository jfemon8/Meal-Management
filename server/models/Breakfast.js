const mongoose = require('mongoose');

// This model tracks breakfast daily costs and auto-deduction
const breakfastSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    // Total cost for the day
    totalCost: {
        type: Number,
        required: true,
        min: 0
    },
    // Description of what was served
    description: {
        type: String,
        default: ''
    },
    // Users who participated in this breakfast
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // Individual cost for this user (totalCost / number of participants)
        cost: {
            type: Number,
            required: true
        },
        // Was the cost successfully deducted
        deducted: {
            type: Boolean,
            default: false
        },
        deductedAt: {
            type: Date
        }
    }],
    // Who submitted this cost
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Is this cost finalized (can't be edited after finalized)
    isFinalized: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
breakfastSchema.index({ date: 1 }, { unique: true });
breakfastSchema.index({ 'participants.user': 1, date: -1 });
breakfastSchema.index({ isFinalized: 1, date: -1 });
breakfastSchema.index({ submittedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Breakfast', breakfastSchema);
