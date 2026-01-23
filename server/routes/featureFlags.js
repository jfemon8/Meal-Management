const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FeatureFlag = require('../models/FeatureFlag');
const { protect, isSuperAdmin, isAdmin } = require('../middleware/auth');

// @route   GET /api/feature-flags
// @desc    Get all feature flags (Admin+)
// @access  Private (Admin+)
router.get('/', protect, isAdmin, async (req, res) => {
    try {
        const { category, enabled } = req.query;

        const query = {};
        if (category) query.category = category;
        if (enabled !== undefined) query.isEnabled = enabled === 'true';

        const flags = await FeatureFlag.find(query)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ category: 1, key: 1 });

        res.json(flags);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/feature-flags/active
// @desc    Get active features for current user
// @access  Private
router.get('/active', protect, async (req, res) => {
    try {
        const environment = process.env.NODE_ENV || 'development';
        const activeFeatures = await FeatureFlag.getActiveFeatures(req.user, environment);
        res.json(activeFeatures);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/feature-flags/check/:key
// @desc    Check if a specific feature is enabled for current user
// @access  Private
router.get('/check/:key', protect, async (req, res) => {
    try {
        const environment = process.env.NODE_ENV || 'development';
        const isEnabled = await FeatureFlag.isFeatureEnabled(req.params.key, req.user, environment);
        res.json({ key: req.params.key, isEnabled });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/feature-flags/:id
// @desc    Get single feature flag
// @access  Private (Admin+)
router.get('/:id', protect, isAdmin, async (req, res) => {
    try {
        const flag = await FeatureFlag.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .populate('allowedUsers', 'name email')
            .populate('history.changedBy', 'name email');

        if (!flag) {
            return res.status(404).json({ message: 'ফিচার ফ্ল্যাগ পাওয়া যায়নি' });
        }

        res.json(flag);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/feature-flags
// @desc    Create new feature flag (SuperAdmin only)
// @access  Private (SuperAdmin)
router.post('/', protect, isSuperAdmin, [
    body('key').notEmpty().withMessage('ফিচার কী আবশ্যক')
        .matches(/^[a-z0-9_]+$/).withMessage('কী শুধু lowercase অক্ষর, সংখ্যা এবং _ হতে পারবে'),
    body('name').notEmpty().withMessage('ফিচার নাম আবশ্যক'),
    body('category').optional().isIn(['meal', 'transaction', 'user', 'report', 'notification', 'system', 'experimental'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { key, name, description, category, isEnabled, allowedRoles,
                rolloutPercentage, environments, startDate, endDate, dependencies, config } = req.body;

        // Check if key already exists
        const existing = await FeatureFlag.findOne({ key });
        if (existing) {
            return res.status(400).json({ message: 'এই কী দিয়ে ফিচার ফ্ল্যাগ আগেই আছে' });
        }

        const flag = await FeatureFlag.create({
            key,
            name,
            description,
            category,
            isEnabled: isEnabled || false,
            allowedRoles: allowedRoles || ['user', 'manager', 'admin', 'superadmin'],
            rolloutPercentage: rolloutPercentage || 100,
            environments: environments || { development: true, staging: true, production: false },
            startDate,
            endDate,
            dependencies,
            config,
            createdBy: req.user._id,
            history: [{
                action: 'created',
                changedBy: req.user._id,
                changedAt: new Date(),
                newValue: { isEnabled: isEnabled || false },
                reason: 'ফিচার ফ্ল্যাগ তৈরি'
            }]
        });

        res.status(201).json({
            message: 'ফিচার ফ্ল্যাগ তৈরি হয়েছে',
            flag
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/feature-flags/:id
// @desc    Update feature flag (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/:id', protect, isSuperAdmin, async (req, res) => {
    try {
        const flag = await FeatureFlag.findById(req.params.id);
        if (!flag) {
            return res.status(404).json({ message: 'ফিচার ফ্ল্যাগ পাওয়া যায়নি' });
        }

        const { name, description, category, allowedRoles, allowedUsers,
                rolloutPercentage, environments, startDate, endDate, dependencies, config, reason } = req.body;

        // Track changes
        const changes = {};
        if (name && name !== flag.name) changes.name = { from: flag.name, to: name };
        if (description !== undefined && description !== flag.description) changes.description = { from: flag.description, to: description };
        if (rolloutPercentage !== undefined && rolloutPercentage !== flag.rolloutPercentage) {
            changes.rolloutPercentage = { from: flag.rolloutPercentage, to: rolloutPercentage };
        }

        // Update fields
        if (name) flag.name = name;
        if (description !== undefined) flag.description = description;
        if (category) flag.category = category;
        if (allowedRoles) flag.allowedRoles = allowedRoles;
        if (allowedUsers) flag.allowedUsers = allowedUsers;
        if (rolloutPercentage !== undefined) flag.rolloutPercentage = rolloutPercentage;
        if (environments) flag.environments = { ...flag.environments, ...environments };
        if (startDate !== undefined) flag.startDate = startDate;
        if (endDate !== undefined) flag.endDate = endDate;
        if (dependencies) flag.dependencies = dependencies;
        if (config) flag.config = { ...flag.config, ...config };

        flag.updatedBy = req.user._id;

        if (Object.keys(changes).length > 0) {
            flag.addHistory('updated', req.user._id, changes, null, reason || 'ফিচার আপডেট');
        }

        await flag.save();

        res.json({
            message: 'ফিচার ফ্ল্যাগ আপডেট হয়েছে',
            flag
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/feature-flags/:id/toggle
// @desc    Enable/Disable feature flag (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/:id/toggle', protect, isSuperAdmin, [
    body('reason').optional().isString()
], async (req, res) => {
    try {
        const flag = await FeatureFlag.findById(req.params.id);
        if (!flag) {
            return res.status(404).json({ message: 'ফিচার ফ্ল্যাগ পাওয়া যায়নি' });
        }

        const previousState = flag.isEnabled;
        flag.isEnabled = !flag.isEnabled;
        flag.updatedBy = req.user._id;

        flag.addHistory(
            flag.isEnabled ? 'enabled' : 'disabled',
            req.user._id,
            { isEnabled: previousState },
            { isEnabled: flag.isEnabled },
            req.body.reason || (flag.isEnabled ? 'ফিচার চালু করা হয়েছে' : 'ফিচার বন্ধ করা হয়েছে')
        );

        await flag.save();

        res.json({
            message: flag.isEnabled ? 'ফিচার চালু হয়েছে' : 'ফিচার বন্ধ হয়েছে',
            flag
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/feature-flags/:id/config
// @desc    Update feature config (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/:id/config', protect, isSuperAdmin, async (req, res) => {
    try {
        const flag = await FeatureFlag.findById(req.params.id);
        if (!flag) {
            return res.status(404).json({ message: 'ফিচার ফ্ল্যাগ পাওয়া যায়নি' });
        }

        const previousConfig = { ...flag.config };
        flag.config = { ...flag.config, ...req.body.config };
        flag.updatedBy = req.user._id;

        flag.addHistory(
            'config_changed',
            req.user._id,
            previousConfig,
            flag.config,
            req.body.reason || 'কনফিগ পরিবর্তন'
        );

        await flag.save();

        res.json({
            message: 'ফিচার কনফিগ আপডেট হয়েছে',
            flag
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/feature-flags/:id/beta-users
// @desc    Add/Remove beta users (SuperAdmin only)
// @access  Private (SuperAdmin)
router.put('/:id/beta-users', protect, isSuperAdmin, [
    body('action').isIn(['add', 'remove']).withMessage('action হতে হবে add অথবা remove'),
    body('userIds').isArray().withMessage('userIds অ্যারে হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const flag = await FeatureFlag.findById(req.params.id);
        if (!flag) {
            return res.status(404).json({ message: 'ফিচার ফ্ল্যাগ পাওয়া যায়নি' });
        }

        const { action, userIds } = req.body;

        if (action === 'add') {
            const uniqueUsers = [...new Set([...flag.allowedUsers.map(u => u.toString()), ...userIds])];
            flag.allowedUsers = uniqueUsers;
        } else {
            flag.allowedUsers = flag.allowedUsers.filter(u => !userIds.includes(u.toString()));
        }

        flag.updatedBy = req.user._id;
        await flag.save();

        res.json({
            message: action === 'add' ? 'বেটা ইউজার যোগ হয়েছে' : 'বেটা ইউজার সরানো হয়েছে',
            flag
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/feature-flags/:id
// @desc    Delete feature flag (SuperAdmin only)
// @access  Private (SuperAdmin)
router.delete('/:id', protect, isSuperAdmin, async (req, res) => {
    try {
        const flag = await FeatureFlag.findById(req.params.id);
        if (!flag) {
            return res.status(404).json({ message: 'ফিচার ফ্ল্যাগ পাওয়া যায়নি' });
        }

        await flag.deleteOne();

        res.json({ message: 'ফিচার ফ্ল্যাগ মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/feature-flags/categories/list
// @desc    Get list of categories
// @access  Private (Admin+)
router.get('/categories/list', protect, isAdmin, async (req, res) => {
    try {
        const categories = [
            { key: 'meal', name: 'মিল ম্যানেজমেন্ট' },
            { key: 'transaction', name: 'লেনদেন' },
            { key: 'user', name: 'ইউজার' },
            { key: 'report', name: 'রিপোর্ট' },
            { key: 'notification', name: 'নোটিফিকেশন' },
            { key: 'system', name: 'সিস্টেম' },
            { key: 'experimental', name: 'পরীক্ষামূলক' }
        ];
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
