import express, { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Group from '../models/Group';
import User from '../models/User';
import { protect, isAdmin, isSuperAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// Middleware to check if user can manage a specific group
const canManageGroup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const groupId = req.params.id || req.params.groupId;

        // Admin and SuperAdmin can manage all groups
        if (['admin', 'superadmin'].includes(req.user!.role)) {
            return next();
        }

        // Check if user is the group manager
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        if ((group as any).manager && (group as any).manager.toString() === req.user!._id.toString()) {
            (req as any).managedGroup = group;
            return next();
        }

        return res.status(403).json({ message: 'এই গ্রুপ ম্যানেজ করার অনুমতি নেই' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
};

// @route   POST /api/groups
// @desc    Create a new group (Admin+ only)
// @access  Private (Admin+)
router.post('/', protect, isAdmin, [
    body('name').trim().notEmpty().withMessage('গ্রুপের নাম আবশ্যক'),
    body('code').optional().trim().isLength({ min: 2, max: 10 }).withMessage('কোড ২-১০ অক্ষরের মধ্যে হতে হবে'),
    body('description').optional().trim()
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, code, description, manager, settings } = req.body;

        // Check if group name exists
        const existingGroup = await Group.findOne({ name });
        if (existingGroup) {
            return res.status(400).json({ message: 'এই নামে গ্রুপ আগে থেকেই আছে' });
        }

        // Check if code exists
        if (code) {
            const existingCode = await Group.findOne({ code: code.toUpperCase() });
            if (existingCode) {
                return res.status(400).json({ message: 'এই কোড আগে থেকেই ব্যবহৃত' });
            }
        }

        // Validate manager if provided
        if (manager) {
            const managerUser = await User.findById(manager);
            if (!managerUser) {
                return res.status(400).json({ message: 'ম্যানেজার ইউজার পাওয়া যায়নি' });
            }
        }

        const group = await Group.create({
            name,
            code: code ? code.toUpperCase() : undefined,
            description,
            manager,
            settings: settings || {},
            createdBy: req.user!._id
        });

        // If manager is set, update the manager user's isGroupManager flag
        if (manager) {
            await User.findByIdAndUpdate(manager, {
                isGroupManager: true,
                group: group._id
            });
        }

        const populatedGroup = await Group.findById(group._id)
            .populate('manager', 'name email')
            .populate('createdBy', 'name');

        res.status(201).json({
            message: 'গ্রুপ সফলভাবে তৈরি হয়েছে',
            group: populatedGroup
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/groups
// @desc    Get all groups (Admin+ or own group for managers)
// @access  Private
router.get('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        let query: any = {};

        // Non-admin users can only see their own group
        if (!['admin', 'superadmin'].includes(req.user!.role)) {
            // If user is a group manager, show their managed group
            if ((req.user as any).isGroupManager) {
                query = { manager: req.user!._id };
            } else if ((req.user as any).group) {
                query = { _id: (req.user as any).group };
            } else {
                return res.json([]); // No groups to show
            }
        }

        const groups = await (Group as any).findWithMemberCount(query);
        res.json(groups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/groups/:id
// @desc    Get group by ID
// @access  Private
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
    try {
        const group: any = await Group.findById(req.params.id)
            .populate('manager', 'name email phone')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');

        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        // Check access
        const canAccess = ['admin', 'superadmin'].includes(req.user!.role) ||
            (group.manager && group.manager._id.toString() === req.user!._id.toString()) ||
            ((req.user as any).group && (req.user as any).group.toString() === group._id.toString());

        if (!canAccess) {
            return res.status(403).json({ message: 'এই গ্রুপ দেখার অনুমতি নেই' });
        }

        // Get member count
        const memberCount = await User.countDocuments({ group: group._id, isActive: true });

        res.json({
            ...group.toObject(),
            memberCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/groups/:id
// @desc    Update group (Admin+ only)
// @access  Private (Admin+)
router.put('/:id', protect, isAdmin, [
    body('name').optional().trim().notEmpty().withMessage('গ্রুপের নাম খালি রাখা যাবে না'),
    body('code').optional().trim().isLength({ min: 2, max: 10 }).withMessage('কোড ২-১০ অক্ষরের মধ্যে হতে হবে')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const group: any = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        const { name, code, description, manager, settings, isActive } = req.body;

        // Check name uniqueness if changing
        if (name && name !== group.name) {
            const existingGroup = await Group.findOne({ name });
            if (existingGroup) {
                return res.status(400).json({ message: 'এই নামে গ্রুপ আগে থেকেই আছে' });
            }
            group.name = name;
        }

        // Check code uniqueness if changing
        if (code !== undefined) {
            if (code && code.toUpperCase() !== group.code) {
                const existingCode = await Group.findOne({ code: code.toUpperCase() });
                if (existingCode) {
                    return res.status(400).json({ message: 'এই কোড আগে থেকেই ব্যবহৃত' });
                }
            }
            group.code = code ? code.toUpperCase() : null;
        }

        // Handle manager change
        if (manager !== undefined && (!group.manager || manager !== group.manager.toString())) {
            // Remove old manager's isGroupManager flag if exists
            if (group.manager) {
                await User.findByIdAndUpdate(group.manager, { isGroupManager: false });
            }

            // Set new manager
            if (manager) {
                const managerUser = await User.findById(manager);
                if (!managerUser) {
                    return res.status(400).json({ message: 'ম্যানেজার ইউজার পাওয়া যায়নি' });
                }
                await User.findByIdAndUpdate(manager, {
                    isGroupManager: true,
                    group: group._id
                });
            }
            group.manager = manager || null;
        }

        if (description !== undefined) group.description = description;
        if (settings) group.settings = { ...group.settings, ...settings };
        if (isActive !== undefined) group.isActive = isActive;
        group.updatedBy = req.user!._id;

        await group.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('manager', 'name email')
            .populate('createdBy', 'name')
            .populate('updatedBy', 'name');

        res.json({
            message: 'গ্রুপ সফলভাবে আপডেট হয়েছে',
            group: updatedGroup
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/groups/:id
// @desc    Delete group (SuperAdmin only)
// @access  Private (SuperAdmin)
router.delete('/:id', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const group: any = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        // Check if group has members
        const memberCount = await User.countDocuments({ group: group._id });
        if (memberCount > 0) {
            return res.status(400).json({
                message: `এই গ্রুপে ${memberCount} জন সদস্য আছে। প্রথমে সদস্যদের অন্য গ্রুপে সরান।`,
                memberCount
            });
        }

        // Remove manager's isGroupManager flag
        if (group.manager) {
            await User.findByIdAndUpdate(group.manager, { isGroupManager: false });
        }

        await Group.findByIdAndDelete(req.params.id);

        res.json({ message: 'গ্রুপ সফলভাবে ডিলিট হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/groups/:id/members
// @desc    Get group members
// @access  Private (Admin+ or Group Manager)
router.get('/:id/members', protect, canManageGroup, async (req: AuthRequest, res: Response) => {
    try {
        const members = await User.find({ group: req.params.id })
            .select('-password')
            .sort({ name: 1 });

        res.json(members);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/groups/:id/members
// @desc    Add user to group
// @access  Private (Admin+ or Group Manager with permission)
router.post('/:id/members', protect, canManageGroup, [
    body('userId').notEmpty().withMessage('ইউজার আইডি আবশ্যক')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const group: any = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        // Check if group manager has permission to add users
        if ((req as any).managedGroup && !group.settings.canManagerAddUsers) {
            return res.status(403).json({ message: 'গ্রুপ ম্যানেজারের ইউজার যোগ করার অনুমতি নেই' });
        }

        const { userId } = req.body;
        const user: any = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check if user is already in a group
        if (user.group) {
            const currentGroup = await Group.findById(user.group);
            return res.status(400).json({
                message: `এই ইউজার ইতোমধ্যে "${currentGroup ? (currentGroup as any).name : 'অন্য'}" গ্রুপে আছে`
            });
        }

        // Add user to group
        user.group = group._id;
        await user.save();

        res.json({
            message: 'ইউজার সফলভাবে গ্রুপে যোগ হয়েছে',
            user: await User.findById(userId).select('-password')
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove user from group
// @access  Private (Admin+ or Group Manager with permission)
router.delete('/:id/members/:userId', protect, canManageGroup, async (req: AuthRequest, res: Response) => {
    try {
        const group: any = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        // Check if group manager has permission to remove users
        if ((req as any).managedGroup && !group.settings.canManagerRemoveUsers) {
            return res.status(403).json({ message: 'গ্রুপ ম্যানেজারের ইউজার সরানোর অনুমতি নেই' });
        }

        const user: any = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check if user is in this group
        if (!user.group || user.group.toString() !== req.params.id) {
            return res.status(400).json({ message: 'এই ইউজার এই গ্রুপে নেই' });
        }

        // Can't remove the group manager
        if (group.manager && group.manager.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'গ্রুপ ম্যানেজারকে গ্রুপ থেকে সরানো যাবে না। প্রথমে অন্য ম্যানেজার নির্ধারণ করুন।' });
        }

        // Remove user from group
        user.group = null;
        user.isGroupManager = false;
        await user.save();

        res.json({
            message: 'ইউজার সফলভাবে গ্রুপ থেকে সরানো হয়েছে'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/groups/:id/manager
// @desc    Set group manager
// @access  Private (Admin+ only)
router.put('/:id/manager', protect, isAdmin, [
    body('userId').notEmpty().withMessage('ইউজার আইডি আবশ্যক')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const group: any = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        const { userId } = req.body;
        const user: any = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Remove old manager's flag
        if (group.manager) {
            await User.findByIdAndUpdate(group.manager, { isGroupManager: false });
        }

        // Set new manager
        group.manager = userId;
        group.updatedBy = req.user!._id;
        await group.save();

        // Update user's group manager flag and ensure they're in this group
        user.isGroupManager = true;
        user.group = group._id;
        await user.save();

        const updatedGroup = await Group.findById(group._id)
            .populate('manager', 'name email phone');

        res.json({
            message: 'গ্রুপ ম্যানেজার সফলভাবে নির্ধারণ হয়েছে',
            group: updatedGroup
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/groups/:id/members/bulk
// @desc    Add multiple users to group
// @access  Private (Admin+ only)
router.post('/:id/members/bulk', protect, isAdmin, [
    body('userIds').isArray({ min: 1 }).withMessage('কমপক্ষে একজন ইউজার আইডি দিন')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        const { userIds } = req.body;
        const results: any = {
            added: [],
            skipped: [],
            errors: []
        };

        for (const userId of userIds) {
            try {
                const user: any = await User.findById(userId);
                if (!user) {
                    results.errors.push({ userId, message: 'ইউজার পাওয়া যায়নি' });
                    continue;
                }

                if (user.group) {
                    results.skipped.push({ userId, name: user.name, message: 'ইতোমধ্যে অন্য গ্রুপে আছে' });
                    continue;
                }

                user.group = group._id;
                await user.save();
                results.added.push({ userId, name: user.name });
            } catch (err: any) {
                results.errors.push({ userId, message: err.message });
            }
        }

        res.json({
            message: `${results.added.length} জন ইউজার যোগ হয়েছে`,
            results
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/groups/available-users
// @desc    Get users not in any group (for adding to groups)
// @access  Private (Admin+)
router.get('/available-users/list', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find({
            group: null,
            isActive: true,
            role: { $ne: 'superadmin' } // Exclude superadmin
        }).select('name email phone role').sort({ name: 1 });

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

export default router;
