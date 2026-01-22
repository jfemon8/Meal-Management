const mongoose = require('mongoose');

// Transaction history for deposits and deductions
const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Type of transaction
    type: {
        type: String,
        enum: ['deposit', 'deduction', 'adjustment', 'refund'],
        required: true
    },
    // Which balance type
    balanceType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner'],
        required: true
    },
    // Amount (positive for deposit, negative for deduction)
    amount: {
        type: Number,
        required: true
    },
    // Balance before transaction
    previousBalance: {
        type: Number,
        required: true
    },
    // Balance after transaction
    newBalance: {
        type: Number,
        required: true
    },
    // Description
    description: {
        type: String,
        default: ''
    },
    // Reference to related document (e.g., Breakfast entry)
    reference: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceModel'
    },
    referenceModel: {
        type: String,
        enum: ['Breakfast', 'Meal', 'MonthSettings']
    },
    // Who performed this transaction
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, balanceType: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
