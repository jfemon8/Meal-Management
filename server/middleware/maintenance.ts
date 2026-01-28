import { Request, Response, NextFunction } from 'express';
import GlobalSettings from '../models/GlobalSettings';
import { AuthRequest } from '../types';

/**
 * Middleware to check if system is in maintenance mode
 * Should be applied after auth middleware so we can check user role
 */
const checkMaintenance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await GlobalSettings.getSettings();
        const maintenance = settings.maintenance;

        // If maintenance is not enabled, continue
        if (!maintenance?.isEnabled) {
            next();
            return;
        }

        // Check if scheduled maintenance window applies
        const now = new Date();

        // If scheduled start is set and we haven't reached it yet, continue
        if (maintenance.scheduledStart && now < new Date(maintenance.scheduledStart)) {
            next();
            return;
        }

        // If scheduled end is set and we've passed it, continue
        if (maintenance.scheduledEnd && now > new Date(maintenance.scheduledEnd)) {
            next();
            return;
        }

        // Check if user is allowed to access during maintenance
        if (req.user) {
            // Check if user's role is in allowed roles
            if (maintenance.allowedRoles?.includes(req.user.role)) {
                next();
                return;
            }

            // Check if user is in allowed users list
            if (maintenance.allowedUsers?.some(id => id.toString() === req.user!._id.toString())) {
                next();
                return;
            }
        }

        // Return maintenance response
        res.status(503).json({
            success: false,
            maintenance: true,
            message: maintenance.message || 'সিস্টেম রক্ষণাবেক্ষণ চলছে',
            messageEn: maintenance.messageEn || 'System is under maintenance',
            scheduledEnd: maintenance.scheduledEnd,
            reason: maintenance.reason
        });
    } catch (error) {
        console.error('Maintenance check error:', error);
        // On error, allow request to continue
        next();
    }
};

/**
 * Middleware for public routes that need maintenance check
 * (doesn't require user to be logged in)
 */
const checkMaintenancePublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await GlobalSettings.getSettings();
        const maintenance = settings.maintenance;

        if (!maintenance?.isEnabled) {
            next();
            return;
        }

        const now = new Date();

        if (maintenance.scheduledStart && now < new Date(maintenance.scheduledStart)) {
            next();
            return;
        }

        if (maintenance.scheduledEnd && now > new Date(maintenance.scheduledEnd)) {
            next();
            return;
        }

        // For public routes, only superadmin login is allowed
        // Check if this is a login request
        if (req.path === '/login' || req.path === '/api/auth/login') {
            next(); // Allow login attempts, will be checked after auth
            return;
        }

        res.status(503).json({
            success: false,
            maintenance: true,
            message: maintenance.message || 'সিস্টেম রক্ষণাবেক্ষণ চলছে',
            messageEn: maintenance.messageEn || 'System is under maintenance',
            scheduledEnd: maintenance.scheduledEnd
        });
    } catch (error) {
        console.error('Maintenance check error:', error);
        next();
    }
};

/**
 * Get current maintenance status (for frontend)
 */
const getMaintenanceStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = await GlobalSettings.getSettings();
        const maintenance = settings.maintenance;

        const now = new Date();
        let isActive: boolean = maintenance?.isEnabled || false;

        // Check scheduled window
        if (isActive && maintenance.scheduledStart && now < new Date(maintenance.scheduledStart)) {
            isActive = false;
        }
        if (isActive && maintenance.scheduledEnd && now > new Date(maintenance.scheduledEnd)) {
            isActive = false;
        }

        res.json({
            isEnabled: maintenance?.isEnabled || false,
            isActive,
            message: maintenance?.message,
            messageEn: maintenance?.messageEn,
            scheduledStart: maintenance?.scheduledStart,
            scheduledEnd: maintenance?.scheduledEnd,
            reason: maintenance?.reason
        });
    } catch (error) {
        console.error('Get maintenance status error:', error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
};

export {
    checkMaintenance,
    checkMaintenancePublic,
    getMaintenanceStatus
};
