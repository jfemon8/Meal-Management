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
        enum: ['deposit', 'deduction', 'adjustment', 'refund', 'reversal'],
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
        enum: ['Breakfast', 'Meal', 'MonthSettings', 'Transaction']
    },
    // Original transaction being reversed (for reversals only)
    originalTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },
    // Reversal reason (required for reversals)
    reversalReason: {
        type: String,
        default: ''
    },
    // Is this transaction reversed
    isReversed: {
        type: Boolean,
        default: false
    },
    // Who performed this transaction
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Data correction fields (Super Admin only)
    isCorrected: {
        type: Boolean,
        default: false
    },
    correctedAt: {
        type: Date,
        default: null
    },
    correctedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    correctionReason: {
        type: String,
        default: ''
    },
    originalAmount: {
        type: Number,
        default: null
    },
    originalDescription: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, balanceType: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ isCorrected: 1, correctedAt: -1 });
transactionSchema.index({ isReversed: 1, createdAt: -1 });
transactionSchema.index({ performedBy: 1, createdAt: -1 });
transactionSchema.index({ reference: 1, referenceModel: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
