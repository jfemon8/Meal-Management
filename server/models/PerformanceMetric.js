const mongoose = require('mongoose');

const performanceMetricSchema = new mongoose.Schema({
    // Metric type
    type: {
        type: String,
        enum: ['api', 'database', 'system'],
        required: true,
        index: true
    },

    // For API metrics
    endpoint: {
        type: String,
        index: true
    },
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    statusCode: Number,
    responseTime: Number, // in milliseconds

    // For Database metrics
    operation: {
        type: String,
        enum: ['find', 'findOne', 'insert', 'update', 'delete', 'aggregate']
    },
    collection: String,
    queryTime: Number, // in milliseconds
    documentsAffected: Number,

    // For System metrics
    cpuUsage: Number, // percentage
    memoryUsage: {
        total: Number, // bytes
        used: Number,
        free: Number,
        percentage: Number
    },
    uptime: Number, // seconds

    // Common fields
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Request info (for API metrics)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userAgent: String,
    ip: String
}, {
    timestamps: false // We use our own timestamp field
});

// Index for efficient querying
performanceMetricSchema.index({ type: 1, timestamp: -1 });
performanceMetricSchema.index({ endpoint: 1, timestamp: -1 });

// TTL index - automatically delete metrics older than 7 days
performanceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Static method to get API performance summary
performanceMetricSchema.statics.getApiSummary = async function(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.aggregate([
        {
            $match: {
                type: 'api',
                timestamp: { $gte: since }
            }
        },
        {
            $group: {
                _id: { endpoint: '$endpoint', method: '$method' },
                avgResponseTime: { $avg: '$responseTime' },
                maxResponseTime: { $max: '$responseTime' },
                minResponseTime: { $min: '$responseTime' },
                totalRequests: { $sum: 1 },
                successCount: {
                    $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] }
                },
                errorCount: {
                    $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
                }
            }
        },
        {
            $project: {
                endpoint: '$_id.endpoint',
                method: '$_id.method',
                avgResponseTime: { $round: ['$avgResponseTime', 2] },
                maxResponseTime: 1,
                minResponseTime: 1,
                totalRequests: 1,
                successCount: 1,
                errorCount: 1,
                errorRate: {
                    $round: [
                        { $multiply: [{ $divide: ['$errorCount', '$totalRequests'] }, 100] },
                        2
                    ]
                }
            }
        },
        { $sort: { totalRequests: -1 } }
    ]);
};

// Static method to get system metrics history
performanceMetricSchema.statics.getSystemMetrics = async function(hours = 24, limit = 100) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.find({
        type: 'system',
        timestamp: { $gte: since }
    })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
};

// Static method to get slow endpoints
performanceMetricSchema.statics.getSlowEndpoints = async function(threshold = 1000, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.aggregate([
        {
            $match: {
                type: 'api',
                timestamp: { $gte: since },
                responseTime: { $gte: threshold }
            }
        },
        {
            $group: {
                _id: { endpoint: '$endpoint', method: '$method' },
                avgResponseTime: { $avg: '$responseTime' },
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                endpoint: '$_id.endpoint',
                method: '$_id.method',
                avgResponseTime: { $round: ['$avgResponseTime', 2] },
                count: 1
            }
        },
        { $sort: { avgResponseTime: -1 } },
        { $limit: 20 }
    ]);
};

module.exports = mongoose.model('PerformanceMetric', performanceMetricSchema);
