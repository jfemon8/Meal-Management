import { Response, NextFunction } from 'express';
import Group from '../models/Group';
import User from '../models/User';
import { AuthRequest, IGroupDocument, IUserDocument, UserRole } from '../types';

/**
 * Middleware to check if user can access group data
 * For Admin/SuperAdmin: Full access to all groups
 * For Manager: Only their group (if they are the group manager)
 */
const canAccessGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const groupId = req.params.groupId || (req.query.groupId as string);

        // Admin/SuperAdmin can access all groups
        if ((['admin', 'superadmin'] as UserRole[]).includes(req.user!.role)) {
            if (groupId) {
                const group = await Group.findById(groupId);
                if (!group) {
                    res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
                    return;
                }
                (req as any).group = group;
            }
            next();
            return;
        }

        // For managers, check if they manage this group
        if (req.user!.role === 'manager') {
            if (!groupId) {
                // If no groupId provided, find the manager's group
                const managedGroup = await Group.findOne({ manager: req.user!._id, isActive: true });
                if (!managedGroup) {
                    res.status(403).json({ message: 'আপনি কোন গ্রুপ ম্যানেজ করেন না' });
                    return;
                }
                (req as any).group = managedGroup;
                (req as any).groupId = managedGroup._id;
                next();
                return;
            }

            const group = await Group.findById(groupId);
            if (!group) {
                res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
                return;
            }

            // Check if user is the manager of this group
            if (!group.manager || group.manager.toString() !== req.user!._id.toString()) {
                res.status(403).json({ message: 'আপনি এই গ্রুপের ম্যানেজার নন' });
                return;
            }

            (req as any).group = group;
            next();
            return;
        }

        res.status(403).json({ message: 'অ্যাক্সেস অনুমোদিত নয়' });
    } catch (error) {
        console.error('Group access check error:', error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
};

/**
 * Get users filtered by group access
 * Admin/SuperAdmin: All users or specific group's users
 * Manager: Only their group's users
 */
const getGroupFilteredUsers = async (req: AuthRequest): Promise<IUserDocument[]> => {
    let userQuery: Record<string, any> = { isActive: true, isDeleted: { $ne: true } };

    // If admin/superadmin and groupId is specified, filter by group
    if ((['admin', 'superadmin'] as UserRole[]).includes(req.user!.role)) {
        if (req.query.groupId || req.params.groupId) {
            userQuery.group = req.query.groupId || req.params.groupId;
        }
        // If no groupId, return all users
        return await User.find(userQuery).select('-password');
    }

    // For managers, always filter by their group
    if (req.user!.role === 'manager') {
        const managedGroup = await Group.findOne({ manager: req.user!._id, isActive: true });
        if (!managedGroup) {
            return [];
        }
        userQuery.group = managedGroup._id;
        return await User.find(userQuery).select('-password');
    }

    return [];
};

/**
 * Check if manager has specific group permission
 */
const checkGroupPermission = (permissionKey: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Admin/SuperAdmin bypass
            if ((['admin', 'superadmin'] as UserRole[]).includes(req.user!.role)) {
                next();
                return;
            }

            // Find manager's group
            const group = (req as any).group || await Group.findOne({ manager: req.user!._id, isActive: true });
            if (!group) {
                res.status(403).json({ message: 'গ্রুপ পাওয়া যায়নি' });
                return;
            }

            // Check permission
            if (!group.settings || !group.settings[permissionKey]) {
                res.status(403).json({
                    message: 'আপনার এই কাজের অনুমতি নেই'
                });
                return;
            }

            (req as any).group = group;
            next();
        } catch (error) {
            console.error('Group permission check error:', error);
            res.status(500).json({ message: 'সার্ভার এরর' });
        }
    };
};

export {
    canAccessGroup,
    getGroupFilteredUsers,
    checkGroupPermission
};
