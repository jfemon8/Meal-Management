const Group = require('../models/Group');
const User = require('../models/User');

/**
 * Middleware to check if user can access group data
 * For Admin/SuperAdmin: Full access to all groups
 * For Manager: Only their group (if they are the group manager)
 */
const canAccessGroup = async (req, res, next) => {
    try {
        const groupId = req.params.groupId || req.query.groupId;

        // Admin/SuperAdmin can access all groups
        if (['admin', 'superadmin'].includes(req.user.role)) {
            if (groupId) {
                const group = await Group.findById(groupId);
                if (!group) {
                    return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
                }
                req.group = group;
            }
            return next();
        }

        // For managers, check if they manage this group
        if (req.user.role === 'manager') {
            if (!groupId) {
                // If no groupId provided, find the manager's group
                const managedGroup = await Group.findOne({ manager: req.user._id, isActive: true });
                if (!managedGroup) {
                    return res.status(403).json({ message: 'আপনি কোন গ্রুপ ম্যানেজ করেন না' });
                }
                req.group = managedGroup;
                req.groupId = managedGroup._id;
                return next();
            }

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
            }

            // Check if user is the manager of this group
            if (!group.manager || group.manager.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'আপনি এই গ্রুপের ম্যানেজার নন' });
            }

            req.group = group;
            return next();
        }

        return res.status(403).json({ message: 'অ্যাক্সেস অনুমোদিত নয়' });
    } catch (error) {
        console.error('Group access check error:', error);
        return res.status(500).json({ message: 'সার্ভার এরর' });
    }
};

/**
 * Get users filtered by group access
 * Admin/SuperAdmin: All users or specific group's users
 * Manager: Only their group's users
 */
const getGroupFilteredUsers = async (req) => {
    let userQuery = { isActive: true, isDeleted: { $ne: true } };

    // If admin/superadmin and groupId is specified, filter by group
    if (['admin', 'superadmin'].includes(req.user.role)) {
        if (req.query.groupId || req.params.groupId) {
            userQuery.group = req.query.groupId || req.params.groupId;
        }
        // If no groupId, return all users
        return await User.find(userQuery).select('-password');
    }

    // For managers, always filter by their group
    if (req.user.role === 'manager') {
        const managedGroup = await Group.findOne({ manager: req.user._id, isActive: true });
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
const checkGroupPermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            // Admin/SuperAdmin bypass
            if (['admin', 'superadmin'].includes(req.user.role)) {
                return next();
            }

            // Find manager's group
            const group = req.group || await Group.findOne({ manager: req.user._id, isActive: true });
            if (!group) {
                return res.status(403).json({ message: 'গ্রুপ পাওয়া যায়নি' });
            }

            // Check permission
            if (!group.settings || !group.settings[permissionKey]) {
                return res.status(403).json({
                    message: 'আপনার এই কাজের অনুমতি নেই'
                });
            }

            req.group = group;
            next();
        } catch (error) {
            console.error('Group permission check error:', error);
            return res.status(500).json({ message: 'সার্ভার এরর' });
        }
    };
};

module.exports = {
    canAccessGroup,
    getGroupFilteredUsers,
    checkGroupPermission
};
