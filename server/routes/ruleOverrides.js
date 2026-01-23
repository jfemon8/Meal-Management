const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const RuleOverride = require('../models/RuleOverride');
const { protect, isManager, isAdmin } = require('../middleware/auth');
const {
    createOverride,
    getApplicableOverrides,
    getEffectiveMealStatus,
    canCreateOverride,
    canModifyOverride
} = require('../services/ruleService');

// @route   GET /api/rule-overrides
// @desc    Get all rule overrides (Manager+ only)
// @access  Private (Manager+)
router.get('/', protect, isManager, async (req, res) => {
    try {
        const { mealType, targetType, isActive, startDate, endDate } = req.query;

        const query = {};

        if (mealType) query.mealType = mealType;
        if (targetType) query.targetType = targetType;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        // Date range filter
        if (startDate && endDate) {
            query.$or = [
                // Single date within range
                {
                    dateType: 'single',
                    startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
                },
                // Range overlapping with query range
                {
                    dateType: 'range',
                    startDate: { $lte: new Date(endDate) },
                    endDate: { $gte: new Date(startDate) }
                },
                // Recurring (always include)
                { dateType: 'recurring' }
            ];
        }

        const overrides = await RuleOverride.find(query)
            .populate('targetUser', 'name email')
            .populate('createdBy', 'name email role')
            .sort({ priority: -1, createdAt: -1 });

        res.json(overrides);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/rule-overrides/check
// @desc    Check effective status for a date/user/mealType
// @access  Private
router.get('/check', protect, async (req, res) => {
    try {
        const { date, userId, mealType = 'lunch' } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'তারিখ আবশ্যক' });
        }

        // Users can only check their own status unless manager+
        let targetUserId = req.user._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            targetUserId = userId;
        }

        const overrides = await getApplicableOverrides(
            new Date(date),
            targetUserId,
            mealType
        );

        res.json({
            date,
            mealType,
            userId: targetUserId,
            applicableOverrides: overrides.map(o => ({
                _id: o._id,
                action: o.action,
                priority: o.priority,
                createdByRole: o.createdByRole,
                reason: o.reason,
                reasonBn: o.reasonBn,
                targetType: o.targetType
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/rule-overrides/effective-status
// @desc    Get effective meal status with full priority resolution
// @access  Private
router.get('/effective-status', protect, async (req, res) => {
    try {
        const { date, userId, mealType = 'lunch' } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'তারিখ আবশ্যক' });
        }

        let targetUserId = req.user._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            targetUserId = userId;
        }

        // Get holidays for context
        const Holiday = require('../models/Holiday');
        const holidays = await Holiday.find({
            date: new Date(date),
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        const status = await getEffectiveMealStatus(
            new Date(date),
            targetUserId,
            mealType,
            holidayDates
        );

        res.json({
            date,
            mealType,
            userId: targetUserId,
            ...status
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/rule-overrides
// @desc    Create a new rule override (Manager+ only)
// @access  Private (Manager+)
router.post('/', protect, isManager, [
    body('targetType').isIn(['user', 'all_users', 'global']).withMessage('টার্গেট টাইপ অবৈধ'),
    body('dateType').isIn(['single', 'range', 'recurring']).withMessage('ডেট টাইপ অবৈধ'),
    body('startDate').notEmpty().withMessage('শুরুর তারিখ আবশ্যক'),
    body('mealType').isIn(['lunch', 'dinner', 'both']).withMessage('মিল টাইপ অবৈধ'),
    body('action').isIn(['force_on', 'force_off']).withMessage('অ্যাকশন অবৈধ')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            targetType,
            targetUser,
            dateType,
            startDate,
            endDate,
            recurringPattern,
            recurringDays,
            mealType,
            action,
            reason,
            reasonBn,
            expiresAt
        } = req.body;

        // Check permission for global/all_users overrides
        if (!canCreateOverride(req.user.role, targetType)) {
            return res.status(403).json({
                message: 'গ্লোবাল বা সকল ইউজারের জন্য রুল শুধুমাত্র এডমিন তৈরি করতে পারবে'
            });
        }

        // Validate range type has endDate
        if (dateType === 'range' && !endDate) {
            return res.status(400).json({
                message: 'রেঞ্জ টাইপের জন্য শেষ তারিখ আবশ্যক'
            });
        }

        // Validate recurring has pattern and days
        if (dateType === 'recurring') {
            if (!recurringPattern || !recurringDays || recurringDays.length === 0) {
                return res.status(400).json({
                    message: 'রিকারিং টাইপের জন্য প্যাটার্ন এবং দিন আবশ্যক'
                });
            }
        }

        // Validate user target has targetUser
        if (targetType === 'user' && !targetUser) {
            return res.status(400).json({
                message: 'ইউজার টার্গেটের জন্য ইউজার আইডি আবশ্যক'
            });
        }

        const override = await createOverride(
            {
                targetType,
                targetUser: targetType === 'user' ? targetUser : null,
                dateType,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                recurringPattern: dateType === 'recurring' ? recurringPattern : null,
                recurringDays: dateType === 'recurring' ? recurringDays : [],
                mealType,
                action,
                reason: reason || '',
                reasonBn: reasonBn || '',
                expiresAt: expiresAt ? new Date(expiresAt) : null
            },
            req.user._id,
            req.user.role
        );

        await override.populate('targetUser', 'name email');
        await override.populate('createdBy', 'name email role');

        res.status(201).json({
            message: 'রুল ওভাররাইড তৈরি হয়েছে',
            override
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/rule-overrides/:id
// @desc    Update a rule override
// @access  Private (Creator or Admin+)
router.put('/:id', protect, isManager, async (req, res) => {
    try {
        const override = await RuleOverride.findById(req.params.id);
        if (!override) {
            return res.status(404).json({ message: 'রুল ওভাররাইড পাওয়া যায়নি' });
        }

        // Check permission
        if (!canModifyOverride(override, req.user._id, req.user.role)) {
            return res.status(403).json({ message: 'এডিট করার অনুমতি নেই' });
        }

        const { action, reason, reasonBn, isActive, expiresAt } = req.body;

        if (action) override.action = action;
        if (reason !== undefined) override.reason = reason;
        if (reasonBn !== undefined) override.reasonBn = reasonBn;
        if (isActive !== undefined) override.isActive = isActive;
        if (expiresAt !== undefined) {
            override.expiresAt = expiresAt ? new Date(expiresAt) : null;
        }

        await override.save();
        await override.populate('targetUser', 'name email');
        await override.populate('createdBy', 'name email role');

        res.json({
            message: 'রুল ওভাররাইড আপডেট হয়েছে',
            override
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/rule-overrides/:id
// @desc    Delete a rule override
// @access  Private (Creator or Admin+)
router.delete('/:id', protect, isManager, async (req, res) => {
    try {
        const override = await RuleOverride.findById(req.params.id);
        if (!override) {
            return res.status(404).json({ message: 'রুল ওভাররাইড পাওয়া যায়নি' });
        }

        // Check permission
        if (!canModifyOverride(override, req.user._id, req.user.role)) {
            return res.status(403).json({ message: 'ডিলিট করার অনুমতি নেই' });
        }

        await override.deleteOne();

        res.json({ message: 'রুল ওভাররাইড ডিলিট হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/rule-overrides/:id/toggle
// @desc    Toggle override active status
// @access  Private (Creator or Admin+)
router.post('/:id/toggle', protect, isManager, async (req, res) => {
    try {
        const override = await RuleOverride.findById(req.params.id);
        if (!override) {
            return res.status(404).json({ message: 'রুল ওভাররাইড পাওয়া যায়নি' });
        }

        // Check permission
        if (!canModifyOverride(override, req.user._id, req.user.role)) {
            return res.status(403).json({ message: 'পরিবর্তন করার অনুমতি নেই' });
        }

        override.isActive = !override.isActive;
        await override.save();

        res.json({
            message: override.isActive ? 'রুল সক্রিয় করা হয়েছে' : 'রুল নিষ্ক্রিয় করা হয়েছে',
            override
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
