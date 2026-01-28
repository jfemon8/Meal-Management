import mongoose from 'mongoose';
import crypto from 'crypto';
import { IErrorLogDocument } from '../types';

const errorLogSchema = new mongoose.Schema({
    // Error classification
    severity: {
        type: String,
        enum: ['critical', 'error', 'warning', 'info'],
        required: true,
        index: true
    },

    // Error details
    message: {
        type: String,
        required: true
    },
    stack: String,
    code: String, // Error code if available

    // Source information
    source: {
        type: String,
        enum: ['api', 'database', 'auth', 'system', 'validation', 'external'],
        required: true,
        index: true
    },

    // Request context (for API errors)
    endpoint: String,
    method: String,
    statusCode: Number,
    requestBody: mongoose.Schema.Types.Mixed,
    requestParams: mongoose.Schema.Types.Mixed,
    requestQuery: mongoose.Schema.Types.Mixed,

    // User context
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userName: String,
    userRole: String,
    ip: String,
    userAgent: String,

    // Additional context
    metadata: mongoose.Schema.Types.Mixed,

    // Resolution tracking
    isResolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolution: String,

    // Occurrence tracking
    occurrenceCount: {
        type: Number,
        default: 1
    },
    firstOccurrence: {
        type: Date,
        default: Date.now
    },
    lastOccurrence: {
        type: Date,
        default: Date.now
    },

    // Error fingerprint for grouping similar errors
    fingerprint: {
        type: String,
        index: true
    }
}, {
    timestamps: true
});

// Indexes
errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ severity: 1, createdAt: -1 });
errorLogSchema.index({ source: 1, createdAt: -1 });
errorLogSchema.index({ isResolved: 1, severity: 1 });

// TTL index - keep errors for 30 days
errorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Generate fingerprint from error message and stack
errorLogSchema.pre('save', function(next) {
    if (!this.fingerprint) {
        const baseString = `${this.source}:${this.message}:${this.endpoint || ''}`;
        this.fingerprint = crypto.createHash('md5').update(baseString).digest('hex');
    }
    next();
});

// Static method to log error (with deduplication)
errorLogSchema.statics.logError = async function(errorData: Record<string, any>) {
    const baseString = `${errorData.source}:${errorData.message}:${errorData.endpoint || ''}`;
    const fingerprint = crypto.createHash('md5').update(baseString).digest('hex');

    // Check for recent similar error (within last hour)
    const recentError = await this.findOne({
        fingerprint,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
    });

    if (recentError) {
        // Update existing error
        recentError.occurrenceCount += 1;
        recentError.lastOccurrence = new Date();
        return recentError.save();
    }

    // Create new error log
    return this.create({
        ...errorData,
        fingerprint
    });
};

// Static method to get error summary
errorLogSchema.statics.getSummary = async function(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [bySeverity, bySource, recentErrors, unresolvedCount] = await Promise.all([
        // Group by severity
        this.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$severity', count: { $sum: '$occurrenceCount' } } }
        ]),

        // Group by source
        this.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$source', count: { $sum: '$occurrenceCount' } } }
        ]),

        // Recent errors
        this.find({ createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name email')
            .lean(),

        // Unresolved critical/error count
        this.countDocuments({
            isResolved: false,
            severity: { $in: ['critical', 'error'] }
        })
    ]);

    return {
        bySeverity: bySeverity.reduce((acc: Record<string, number>, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, { critical: 0, error: 0, warning: 0, info: 0 }),
        bySource: bySource.reduce((acc: Record<string, number>, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        recentErrors,
        unresolvedCount,
        totalErrors: bySeverity.reduce((sum: number, item: any) => sum + item.count, 0)
    };
};

// Static method to get error trends
errorLogSchema.statics.getTrends = async function(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    severity: '$severity'
                },
                count: { $sum: '$occurrenceCount' }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                errors: {
                    $push: {
                        severity: '$_id.severity',
                        count: '$count'
                    }
                },
                total: { $sum: '$count' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

export default mongoose.model<IErrorLogDocument>('ErrorLog', errorLogSchema);
