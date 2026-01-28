const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const GlobalSettings = require('../models/GlobalSettings');
const { protect, isAdmin } = require('../middleware/auth');

// @route   GET /api/global-settings
// @desc    Get global settings
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const settings = await GlobalSettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings
// @desc    Update global settings (Admin+ only)
// @access  Private (Admin+)
router.put('/', protect, isAdmin, async (req, res) => {
    try {
        const updates = req.body;

        // Remove protected fields
        delete updates._id;
        delete updates.type;
        delete updates.createdAt;
        delete updates.updatedAt;
        delete updates.__v;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'গ্লোবাল সেটিংস আপডেট হয়েছে',
            settings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings/default-rates
// @desc    Update default meal rates (Admin+ only)
// @access  Private (Admin+)
router.put('/default-rates', protect, isAdmin, [
    body('lunch').optional().isNumeric().withMessage('লাঞ্চ রেট সংখ্যা হতে হবে'),
    body('dinner').optional().isNumeric().withMessage('ডিনার রেট সংখ্যা হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { lunch, dinner } = req.body;

        const updates = { defaultRates: {} };
        if (lunch !== undefined) updates.defaultRates.lunch = lunch;
        if (dinner !== undefined) updates.defaultRates.dinner = dinner;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'ডিফল্ট মিল রেট আপডেট হয়েছে',
            defaultRates: settings.defaultRates
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings/cutoff-times
// @desc    Update meal cutoff times (Admin+ only)
// @access  Private (Admin+)
router.put('/cutoff-times', protect, isAdmin, [
    body('lunch').optional().isInt({ min: 0, max: 23 }).withMessage('লাঞ্চ কাটঅফ ০-২৩ ঘণ্টার মধ্যে হতে হবে'),
    body('dinner').optional().isInt({ min: 0, max: 23 }).withMessage('ডিনার কাটঅফ ০-২৩ ঘণ্টার মধ্যে হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { lunch, dinner } = req.body;

        const updates = { cutoffTimes: {} };
        if (lunch !== undefined) updates.cutoffTimes.lunch = lunch;
        if (dinner !== undefined) updates.cutoffTimes.dinner = dinner;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'কাটঅফ টাইম আপডেট হয়েছে',
            cutoffTimes: settings.cutoffTimes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings/default-meal-status
// @desc    Update default meal status (Admin+ only)
// @access  Private (Admin+)
router.put('/default-meal-status', protect, isAdmin, async (req, res) => {
    try {
        const { lunch, dinner } = req.body;

        const updates = { defaultMealStatus: {} };
        if (lunch !== undefined) updates.defaultMealStatus.lunch = lunch;
        if (dinner !== undefined) updates.defaultMealStatus.dinner = dinner;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'ডিফল্ট মিল স্ট্যাটাস আপডেট হয়েছে',
            defaultMealStatus: settings.defaultMealStatus
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings/weekend-policy
// @desc    Update weekend policy (Admin+ only)
// @access  Private (Admin+)
router.put('/weekend-policy', protect, isAdmin, async (req, res) => {
    try {
        const { fridayOff, saturdayOff, oddSaturdayOff, evenSaturdayOff } = req.body;

        const updates = { weekendPolicy: {} };
        if (fridayOff !== undefined) updates.weekendPolicy.fridayOff = fridayOff;
        if (saturdayOff !== undefined) updates.weekendPolicy.saturdayOff = saturdayOff;
        if (oddSaturdayOff !== undefined) updates.weekendPolicy.oddSaturdayOff = oddSaturdayOff;
        if (evenSaturdayOff !== undefined) updates.weekendPolicy.evenSaturdayOff = evenSaturdayOff;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'উইকেন্ড পলিসি আপডেট হয়েছে',
            weekendPolicy: settings.weekendPolicy
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings/holiday-policy
// @desc    Update holiday policy (Admin+ only)
// @access  Private (Admin+)
router.put('/holiday-policy', protect, isAdmin, async (req, res) => {
    try {
        const { governmentHolidayOff, optionalHolidayOff, religiousHolidayOff } = req.body;

        const updates = { holidayPolicy: {} };
        if (governmentHolidayOff !== undefined) updates.holidayPolicy.governmentHolidayOff = governmentHolidayOff;
        if (optionalHolidayOff !== undefined) updates.holidayPolicy.optionalHolidayOff = optionalHolidayOff;
        if (religiousHolidayOff !== undefined) updates.holidayPolicy.religiousHolidayOff = religiousHolidayOff;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'ছুটির দিনের পলিসি আপডেট হয়েছে',
            holidayPolicy: settings.holidayPolicy
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/global-settings/registration
// @desc    Update registration settings (Admin+ only)
// @access  Private (Admin+)
router.put('/registration', protect, isAdmin, async (req, res) => {
    try {
        const { allowRegistration, defaultRole, requireEmailVerification } = req.body;

        const updates = { registration: {} };
        if (allowRegistration !== undefined) updates.registration.allowRegistration = allowRegistration;
        if (defaultRole !== undefined) updates.registration.defaultRole = defaultRole;
        if (requireEmailVerification !== undefined) updates.registration.requireEmailVerification = requireEmailVerification;

        const settings = await GlobalSettings.updateSettings(updates, req.user._id);

        res.json({
            message: 'রেজিস্ট্রেশন সেটিংস আপডেট হয়েছে',
            registration: settings.registration
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/global-settings/reset
// @desc    Reset global settings to defaults (Admin+ only)
// @access  Private (Admin+)
router.post('/reset', protect, isAdmin, async (req, res) => {
    try {
        // Delete existing settings
        await GlobalSettings.deleteOne({ type: 'global' });

        // Create new with defaults
        const settings = await GlobalSettings.create({
            type: 'global',
            modifiedBy: req.user._id
        });

        res.json({
            message: 'গ্লোবাল সেটিংস ডিফল্টে রিসেট হয়েছে',
            settings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
