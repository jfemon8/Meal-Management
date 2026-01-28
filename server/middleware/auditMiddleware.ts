import { Response, NextFunction } from 'express';
import { logAction } from '../services/auditService';
import { AuthRequest } from '../types';

/**
 * Audit Middleware
 * Automatically logs API actions based on route patterns
 */

interface AuditOptions {
    targetModel?: string;
    getTargetId?: (req: AuthRequest, data: any) => string;
    description?: string;
    includeNewData?: boolean;
    getMetadata?: (req: AuthRequest, data: any) => Record<string, any>;
    isReversible?: boolean;
}

/**
 * Create audit middleware for a specific category and action
 */
const auditLog = (category: string, action: string, options: AuditOptions = {}) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        // Store original json function
        const originalJson = res.json.bind(res);

        // Override json to capture response
        res.json = function(data: any) {
            // Log after successful response
            if (res.statusCode < 400) {
                logAction(req, {
                    category,
                    action,
                    targetModel: options.targetModel,
                    targetId: options.getTargetId ? options.getTargetId(req, data) : req.params.id,
                    description: options.description,
                    previousData: (req as any).previousData, // Set by controller if needed
                    newData: options.includeNewData ? data : null,
                    metadata: options.getMetadata ? options.getMetadata(req, data) : {},
                    status: 'success',
                    isReversible: options.isReversible || false
                }).catch((err: Error) => console.error('Audit log error:', err));
            }

            return originalJson(data);
        };

        next();
    };
};

/**
 * Log failed actions
 */
const auditError = (category: string, action: string) => {
    return (err: Error, req: AuthRequest, res: Response, next: NextFunction): void => {
        logAction(req, {
            category,
            action,
            status: 'failed',
            errorMessage: err.message
        }).catch((e: Error) => console.error('Audit error log failed:', e));

        next(err);
    };
};

/**
 * Middleware to capture previous state before update/delete
 */
const capturePreviousState = (model: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (req.params.id) {
                const Model = require(`../models/${model}`);
                (req as any).previousData = await Model.findById(req.params.id).lean();
            }
            next();
        } catch (error) {
            next();
        }
    };
};

export {
    auditLog,
    auditError,
    capturePreviousState
};
