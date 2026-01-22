const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const MonthSettings = require('../models/MonthSettings');
const { protect, isManager } = require('../middleware/auth');
const { getDefaultMonthRange, isValidDateRange } = require('../utils/dateUtils');

// @route   GET /api/month-settings
// @desc    Get month settings
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { year, month } = req.query;

        if (year && month) {
            let settings = await MonthSettings.findOne({
                year: parseInt(year),
                month: parseInt(month)
            }).populate('createdBy', 'name').populate('modifiedBy', 'name');

            if (!settings) {
                // Return default settings
                const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
                settings = {
                    year: parseInt(year),
                    month: parseInt(month),
                    startDate,
                    endDate,
                    lunchRate: 0,
                    dinnerRate: 0,
                    isFinalized: false,
                    isDefault: true
                };
            }

            return res.json(settings);
        }

        // Get all settings
        const settings = await MonthSettings.find()
            .populate('createdBy', 'name')
            .sort({ year: -1, month: -1 });

        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/month-settings
// @desc    Create/Update month settings (Manager+ only)
// @access  Private (Manager+)
router.post('/', protect, isManager, [
    body('year').isInt({ min: 2020, max: 2100 }).withMessage('সঠিক বছর দিন'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('সঠিক মাস দিন'),
    body('startDate').notEmpty().withMessage('শুরুর তারিখ আবশ্যক'),
    body('endDate').notEmpty().withMessage('শেষের তারিখ আবশ্যক'),
    body('lunchRate').isNumeric().withMessage('দুপুরের মিল রেট সংখ্যা হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { year, month, startDate, endDate, lunchRate, dinnerRate, notes } = req.body;

        // Validate date range
        if (!isValidDateRange(startDate, endDate)) {
            return res.status(400).json({
                message: 'মাসের রেঞ্জ সর্বোচ্চ ৩১ দিন এবং শুরুর তারিখ শেষের তারিখের আগে হতে হবে'
            });
        }

        // Check if settings already exist
        let settings = await MonthSettings.findOne({ year, month });

        if (settings) {
            // Update existing
            if (settings.isFinalized) {
                return res.status(400).json({ message: 'ফাইনালাইজড মাসের সেটিংস পরিবর্তন করা যাবে না' });
            }

            settings.startDate = new Date(startDate);
            settings.endDate = new Date(endDate);
            settings.lunchRate = lunchRate;
            settings.dinnerRate = dinnerRate || 0;
            settings.notes = notes || '';
            settings.modifiedBy = req.user._id;

            await settings.save();

            res.json({
                message: 'মাসের সেটিংস আপডেট হয়েছে',
                settings
            });
        } else {
            // Create new
            settings = await MonthSettings.create({
                year,
                month,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                lunchRate,
                dinnerRate: dinnerRate || 0,
                notes: notes || '',
                createdBy: req.user._id
            });

            res.status(201).json({
                message: 'মাসের সেটিংস তৈরি হয়েছে',
                settings
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/month-settings/:id/finalize
// @desc    Finalize month settings (Manager+ only)
// @access  Private (Manager+)
router.put('/:id/finalize', protect, isManager, async (req, res) => {
    try {
        const settings = await MonthSettings.findById(req.params.id);
        if (!settings) {
            return res.status(404).json({ message: 'মাসের সেটিংস পাওয়া যায়নি' });
        }

        settings.isFinalized = true;
        settings.modifiedBy = req.user._id;
        await settings.save();

        res.json({
            message: 'মাসের সেটিংস ফাইনালাইজ করা হয়েছে',
            settings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/month-settings/current
// @desc    Get current month settings
// @access  Private
router.get('/current', protect, async (req, res) => {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        let settings = await MonthSettings.findOne({ year, month })
            .populate('createdBy', 'name')
            .populate('modifiedBy', 'name');

        if (!settings) {
            const { startDate, endDate } = getDefaultMonthRange(year, month);
            settings = {
                year,
                month,
                startDate,
                endDate,
                lunchRate: 0,
                dinnerRate: 0,
                isFinalized: false,
                isDefault: true
            };
        }

        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
