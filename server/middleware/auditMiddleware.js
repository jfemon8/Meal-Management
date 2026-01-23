const { logAction } = require('../services/auditService');

/**
 * Audit Middleware
 * Automatically logs API actions based on route patterns
 */

/**
 * Create audit middleware for a specific category and action
 */
const auditLog = (category, action, options = {}) => {
    return async (req, res, next) => {
        // Store original json function
        const originalJson = res.json.bind(res);

        // Override json to capture response
        res.json = function(data) {
            // Log after successful response
            if (res.statusCode < 400) {
                logAction(req, {
                    category,
                    action,
                    targetModel: options.targetModel,
                    targetId: options.getTargetId ? options.getTargetId(req, data) : req.params.id,
                    description: options.description,
                    previousData: req.previousData, // Set by controller if needed
                    newData: options.includeNewData ? data : null,
                    metadata: options.getMetadata ? options.getMetadata(req, data) : {},
                    status: 'success',
                    isReversible: options.isReversible || false
                }).catch(err => console.error('Audit log error:', err));
            }

            return originalJson(data);
        };

        next();
    };
};

/**
 * Log failed actions
 */
const auditError = (category, action) => {
    return (err, req, res, next) => {
        logAction(req, {
            category,
            action,
            status: 'failed',
            errorMessage: err.message
        }).catch(e => console.error('Audit error log failed:', e));

        next(err);
    };
};

/**
 * Middleware to capture previous state before update/delete
 */
const capturePreviousState = (model) => {
    return async (req, res, next) => {
        try {
            if (req.params.id) {
                const Model = require(`../models/${model}`);
                req.previousData = await Model.findById(req.params.id).lean();
            }
            next();
        } catch (error) {
            next();
        }
    };
};

module.exports = {
    auditLog,
    auditError,
    capturePreviousState
};
