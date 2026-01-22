const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Holiday = require('../models/Holiday');
const { protect, isManager, isAdmin } = require('../middleware/auth');

// Bangladesh public holidays 2026 (sample data)
const defaultHolidays2026 = [
    { date: '2026-02-21', name: 'International Mother Language Day', nameBn: 'আন্তর্জাতিক মাতৃভাষা দিবস', type: 'government' },
    { date: '2026-03-17', name: 'Birthday of Father of the Nation', nameBn: 'জাতির পিতার জন্মদিন', type: 'government' },
    { date: '2026-03-26', name: 'Independence Day', nameBn: 'স্বাধীনতা দিবস', type: 'government' },
    { date: '2026-04-14', name: 'Bengali New Year', nameBn: 'পহেলা বৈশাখ', type: 'government' },
    { date: '2026-05-01', name: 'May Day', nameBn: 'মে দিবস', type: 'government' },
    { date: '2026-08-15', name: 'National Mourning Day', nameBn: 'জাতীয় শোক দিবস', type: 'government' },
    { date: '2026-12-16', name: 'Victory Day', nameBn: 'বিজয় দিবস', type: 'government' },
    { date: '2026-12-25', name: 'Christmas Day', nameBn: 'বড়দিন', type: 'government' }
];

// @route   GET /api/holidays
// @desc    Get holidays for a year/month
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const { year, month, startDate, endDate } = req.query;

        let query = { isActive: true };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (year) {
            const start = month
                ? new Date(year, month - 1, 1)
                : new Date(year, 0, 1);
            const end = month
                ? new Date(year, month, 0)
                : new Date(year, 11, 31);

            query.date = { $gte: start, $lte: end };
        }

        const holidays = await Holiday.find(query)
            .populate('addedBy', 'name')
            .sort({ date: 1 });

        res.json(holidays);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/holidays
// @desc    Add a new holiday (Admin+ only)
// @access  Private (Admin+)
router.post('/', protect, isAdmin, [
    body('date').notEmpty().withMessage('তারিখ আবশ্যক'),
    body('name').notEmpty().withMessage('ইংরেজি নাম আবশ্যক'),
    body('nameBn').notEmpty().withMessage('বাংলা নাম আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, name, nameBn, type, isRecurring } = req.body;
        const holidayDate = new Date(date);

        // Check if holiday already exists
        const existing = await Holiday.findOne({ date: holidayDate });
        if (existing) {
            return res.status(400).json({ message: 'এই তারিখে আগে থেকেই ছুটি আছে' });
        }

        const holiday = await Holiday.create({
            date: holidayDate,
            name,
            nameBn,
            type: type || 'government',
            isRecurring: isRecurring || false,
            recurringMonth: isRecurring ? holidayDate.getMonth() + 1 : undefined,
            recurringDay: isRecurring ? holidayDate.getDate() : undefined,
            addedBy: req.user._id
        });

        res.status(201).json({
            message: 'ছুটি যোগ করা হয়েছে',
            holiday
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/holidays/:id
// @desc    Update a holiday (Admin+ only)
// @access  Private (Admin+)
router.put('/:id', protect, isAdmin, async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'ছুটি পাওয়া যায়নি' });
        }

        const { date, name, nameBn, type, isRecurring, isActive } = req.body;

        if (date) holiday.date = new Date(date);
        if (name) holiday.name = name;
        if (nameBn) holiday.nameBn = nameBn;
        if (type) holiday.type = type;
        if (isRecurring !== undefined) {
            holiday.isRecurring = isRecurring;
            if (isRecurring && date) {
                const d = new Date(date);
                holiday.recurringMonth = d.getMonth() + 1;
                holiday.recurringDay = d.getDate();
            }
        }
        if (isActive !== undefined) holiday.isActive = isActive;

        await holiday.save();

        res.json({
            message: 'ছুটি আপডেট করা হয়েছে',
            holiday
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/holidays/:id
// @desc    Delete a holiday (Admin+ only)
// @access  Private (Admin+)
router.delete('/:id', protect, isAdmin, async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'ছুটি পাওয়া যায়নি' });
        }

        res.json({ message: 'ছুটি মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/holidays/seed
// @desc    Seed default holidays for 2026 (Admin+ only)
// @access  Private (Admin+)
router.post('/seed', protect, isAdmin, async (req, res) => {
    try {
        const { year } = req.body;

        // For now, only 2026 data is available
        if (year !== 2026) {
            return res.status(400).json({ message: 'শুধুমাত্র ২০২৬ সালের ছুটির তালিকা আছে' });
        }

        let addedCount = 0;
        for (const h of defaultHolidays2026) {
            const existing = await Holiday.findOne({ date: new Date(h.date) });
            if (!existing) {
                await Holiday.create({
                    ...h,
                    date: new Date(h.date),
                    addedBy: req.user._id
                });
                addedCount++;
            }
        }

        res.json({ message: `${addedCount}টি ছুটি যোগ করা হয়েছে` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
