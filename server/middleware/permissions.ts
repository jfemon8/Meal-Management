import { Response, NextFunction } from 'express';
import { hasPermission, hasAnyPermission, hasAllPermissions, hasCustomPermission } from '../config/permissions';
import { AuthRequest, UserRole } from '../types';

/**
 * Middleware to check if user has a specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
const requirePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                message: 'অনুমতি নেই। প্রথমে লগইন করুন।'
            });
            return;
        }

        const userRole: UserRole = req.user.role;
        const customPermissions: string[] = req.user.permissions || [];

        // Check role-based permission
        const hasRolePermission = hasPermission(userRole, permission);

        // Check custom user permission (if any)
        const hasUserPermission = hasCustomPermission(customPermissions, permission);

        if (hasRolePermission || hasUserPermission) {
            return next();
        }

        res.status(403).json({
            message: 'আপনার এই কাজ করার অনুমতি নেই।',
            required_permission: permission
        });
    };
};

/**
 * Middleware to check if user has ANY of the specified permissions
 * @param {string[]} permissions - Array of permissions (OR logic)
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (permissions: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                message: 'অনুমতি নেই। প্রথমে লগইন করুন।'
            });
            return;
        }

        if (!Array.isArray(permissions) || permissions.length === 0) {
            res.status(500).json({
                message: 'সার্ভার কনফিগারেশন ত্রুটি: কোন পারমিশন নির্দিষ্ট করা হয়নি।'
            });
            return;
        }

        const userRole: UserRole = req.user.role;
        const customPermissions: string[] = req.user.permissions || [];

        // Check if user has any of the role-based permissions
        const hasAnyRolePermission = hasAnyPermission(userRole, permissions);

        // Check if user has any custom permission
        const hasAnyUserPermission = permissions.some(perm =>
            hasCustomPermission(customPermissions, perm)
        );

        if (hasAnyRolePermission || hasAnyUserPermission) {
            return next();
        }

        res.status(403).json({
            message: 'আপনার এই কাজ করার অনুমতি নেই।',
            required_permissions: permissions
        });
    };
};

/**
 * Middleware to check if user has ALL of the specified permissions
 * @param {string[]} permissions - Array of permissions (AND logic)
 * @returns {Function} Express middleware
 */
const requireAllPermissions = (permissions: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                message: 'অনুমতি নেই। প্রথমে লগইন করুন।'
            });
            return;
        }

        if (!Array.isArray(permissions) || permissions.length === 0) {
            res.status(500).json({
                message: 'সার্ভার কনফিগারেশন ত্রুটি: কোন পারমিশন নির্দিষ্ট করা হয়নি।'
            });
            return;
        }

        const userRole: UserRole = req.user.role;
        const customPermissions: string[] = req.user.permissions || [];

        // Check if user has all role-based permissions
        const hasRolePermissions = hasAllPermissions(userRole, permissions);

        // Check if user has all custom permissions
        const hasUserPermissions = permissions.every(perm =>
            hasCustomPermission(customPermissions, perm)
        );

        if (hasRolePermissions || hasUserPermissions) {
            return next();
        }

        res.status(403).json({
            message: 'আপনার সকল প্রয়োজনীয় অনুমতি নেই।',
            required_permissions: permissions
        });
    };
};

/**
 * Middleware to check resource ownership
 * Allows access if user owns the resource OR has the required permission
 * @param {string} permission - Permission required if not owner
 * @param {Function} getResourceUserId - Function to extract userId from request
 * @returns {Function} Express middleware
 */
const requireOwnershipOrPermission = (permission: string, getResourceUserId: (req: AuthRequest) => string | undefined) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                message: 'অনুমতি নেই। প্রথমে লগইন করুন।'
            });
            return;
        }

        // Get the resource's user ID
        const resourceUserId = getResourceUserId(req);

        // Check if user owns the resource
        if (resourceUserId && resourceUserId.toString() === req.user.id.toString()) {
            return next();
        }

        // If not owner, check permission
        const userRole: UserRole = req.user.role;
        const customPermissions: string[] = req.user.permissions || [];

        const hasRolePermission = hasPermission(userRole, permission);
        const hasUserPermission = hasCustomPermission(customPermissions, permission);

        if (hasRolePermission || hasUserPermission) {
            return next();
        }

        res.status(403).json({
            message: 'আপনি শুধুমাত্র নিজের তথ্য দেখতে বা পরিবর্তন করতে পারবেন।'
        });
    };
};

export {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireOwnershipOrPermission,
};
