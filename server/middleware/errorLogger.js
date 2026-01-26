const ErrorLog = require('../models/ErrorLog');

// Determine error severity based on status code and error type
const getSeverity = (statusCode, error) => {
    if (statusCode >= 500 || error.name === 'MongoError' || error.name === 'MongooseError') {
        return 'critical';
    }
    if (statusCode >= 400 && statusCode < 500) {
        return 'warning';
    }
    if (error.name === 'ValidationError') {
        return 'info';
    }
    return 'error';
};

// Determine error source
const getSource = (error, req) => {
    if (error.name === 'MongoError' || error.name === 'MongooseError' || error.name === 'CastError') {
        return 'database';
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return 'auth';
    }
    if (error.name === 'ValidationError') {
        return 'validation';
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return 'external';
    }
    return 'api';
};

// Error logging middleware
const errorLogger = async (err, req, res, next) => {
    const statusCode = err.statusCode || res.statusCode || 500;
    const severity = getSeverity(statusCode, err);
    const source = getSource(err, req);

    // Don't log 404s as errors unless they're API routes
    if (statusCode === 404 && !req.path.startsWith('/api')) {
        return next(err);
    }

    // Prepare error data
    const errorData = {
        severity,
        source,
        message: err.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code,
        endpoint: req.route?.path || req.path,
        method: req.method,
        statusCode,
        requestBody: sanitizeBody(req.body),
        requestParams: req.params,
        requestQuery: req.query,
        userId: req.user?._id,
        userName: req.user?.name,
        userRole: req.user?.role,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: {
            originalUrl: req.originalUrl,
            hostname: req.hostname,
            protocol: req.protocol
        }
    };

    // Log error asynchronously
    setImmediate(async () => {
        try {
            await ErrorLog.logError(errorData);
        } catch (logError) {
            console.error('Failed to log error:', logError.message);
        }
    });

    next(err);
};

// Sanitize request body to remove sensitive data
const sanitizeBody = (body) => {
    if (!body) return undefined;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'newPassword', 'oldPassword', 'token', 'refreshToken', 'secret'];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    });

    return sanitized;
};

// Helper function to manually log errors
const logError = async (error, context = {}) => {
    try {
        await ErrorLog.logError({
            severity: context.severity || 'error',
            source: context.source || 'system',
            message: error.message || String(error),
            stack: error.stack,
            code: error.code,
            ...context
        });
    } catch (logError) {
        console.error('Failed to log error:', logError.message);
    }
};

module.exports = {
    errorLogger,
    logError
};
