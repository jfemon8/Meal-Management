const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Meal = require('../models/Meal');
const Holiday = require('../models/Holiday');
const MonthSettings = require('../models/MonthSettings');
const { protect, isManager } = require('../middleware/auth');
const { requirePermission, requireOwnershipOrPermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const {
    isDefaultMealOff,
    isPast,
    isToday,
    isFuture,
    formatDate,
    getDatesBetween
} = require('../utils/dateUtils');

// @route   GET /api/meals/status
// @desc    Get meal status for a date range
// @access  Private (VIEW_OWN_MEALS or VIEW_ALL_MEALS)
router.get('/status', protect, async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;

        // Users can only see their own meals, unless they have VIEW_ALL_MEALS permission
        let targetUserId = req.user._id;
        if (userId) {
            // Check if user has permission to view other users' meals
            const User = require('../models/User');
            const currentUser = await User.findById(req.user._id);

            if (!currentUser.hasPermission(PERMISSIONS.VIEW_ALL_MEALS)) {
                return res.status(403).json({
                    message: 'আপনি শুধুমাত্র নিজের মিল দেখতে পারবেন।'
                });
            }

            targetUserId = userId;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get holidays for the period
        const holidays = await Holiday.find({
            date: { $gte: start, $lte: end },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get manually set meals
        const meals = await Meal.find({
            user: targetUserId,
            date: { $gte: start, $lte: end },
            mealType: 'lunch'
        });

        // Build response with default and manual status
        const dates = getDatesBetween(start, end);
        const mealStatus = dates.map(date => {
            const dateStr = formatDate(date);
            const manualMeal = meals.find(m => formatDate(m.date) === dateStr);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);

            return {
                date: dateStr,
                isDefaultOff,
                isOn: manualMeal ? manualMeal.isOn : !isDefaultOff,
                count: manualMeal ? manualMeal.count : (!isDefaultOff ? 1 : 0),
                isManuallySet: !!manualMeal,
                canEdit: isFuture(date) || (isManager && !isPast(date))
            };
        });

        res.json(mealStatus);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/meals/toggle
// @desc    Toggle meal on/off for a specific date
// @access  Private
router.put('/toggle', protect, [
    body('date').notEmpty().withMessage('তারিখ আবশ্যক'),
    body('isOn').isBoolean().withMessage('isOn বুলিয়ান হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, isOn, userId, count } = req.body;
        const mealDate = new Date(date);

        // Check permissions
        let targetUserId = req.user._id;
        const isManagerRole = ['manager', 'admin', 'superadmin'].includes(req.user.role);

        if (userId && isManagerRole) {
            targetUserId = userId;
        } else if (userId && userId !== req.user._id.toString()) {
            return res.status(403).json({ message: 'অন্যের মিল পরিবর্তন করার অনুমতি নেই' });
        }

        // User can only change future meals
        if (!isManagerRole) {
            if (!isFuture(mealDate)) {
                return res.status(400).json({
                    message: 'আপনি শুধুমাত্র ভবিষ্যতের মিল অন/অফ করতে পারবেন'
                });
            }
        } else {
            // Manager can change current month's meals only
            const today = new Date();
            const currentMonthSettings = await MonthSettings.findOne({
                year: today.getFullYear(),
                month: today.getMonth() + 1
            });

            if (currentMonthSettings) {
                if (mealDate < currentMonthSettings.startDate || mealDate > currentMonthSettings.endDate) {
                    return res.status(400).json({
                        message: 'এই তারিখ বর্তমান মাসের রেঞ্জের বাইরে'
                    });
                }
            } else {
                // Use default month range
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                if (mealDate < monthStart || mealDate > monthEnd) {
                    return res.status(400).json({
                        message: 'এই তারিখ বর্তমান মাসের বাইরে'
                    });
                }
            }
        }

        // Update or create meal record
        const meal = await Meal.findOneAndUpdate(
            { user: targetUserId, date: mealDate, mealType: 'lunch' },
            {
                isOn,
                count: isOn ? (count || 1) : 0,
                modifiedBy: req.user._id,
                isManuallySet: true
            },
            { upsert: true, new: true }
        );

        res.json({
            message: isOn ? 'মিল অন করা হয়েছে' : 'মিল অফ করা হয়েছে',
            meal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/meals/count
// @desc    Update meal count for a specific date (Manager+ only)
// @access  Private (Manager+)
router.put('/count', protect, isManager, [
    body('date').notEmpty().withMessage('তারিখ আবশ্যক'),
    body('userId').notEmpty().withMessage('ইউজার আইডি আবশ্যক'),
    body('count').isInt({ min: 0 }).withMessage('সংখ্যা ০ বা তার বেশি হতে হবে')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, userId, count, notes } = req.body;
        const mealDate = new Date(date);

        const meal = await Meal.findOneAndUpdate(
            { user: userId, date: mealDate, mealType: 'lunch' },
            {
                isOn: count > 0,
                count,
                modifiedBy: req.user._id,
                isManuallySet: true,
                notes: notes || ''
            },
            { upsert: true, new: true }
        );

        res.json({
            message: 'মিল সংখ্যা আপডেট হয়েছে',
            meal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/meals/summary
// @desc    Get meal summary for a user for a month
// @access  Private
router.get('/summary', protect, async (req, res) => {
    try {
        const { year, month, userId } = req.query;

        let targetUserId = req.user._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            targetUserId = userId;
        }

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        // Use default if no settings exist
        if (!monthSettings) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            monthSettings = {
                startDate,
                endDate,
                lunchRate: 0
            };
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get meals
        const meals = await Meal.find({
            user: targetUserId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        // Calculate totals
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        let totalMeals = 0;
        let totalDaysOn = 0;

        dates.forEach(date => {
            const dateStr = formatDate(date);
            const manualMeal = meals.find(m => formatDate(m.date) === dateStr);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);

            if (manualMeal) {
                if (manualMeal.isOn) {
                    totalMeals += manualMeal.count;
                    totalDaysOn++;
                }
            } else if (!isDefaultOff) {
                totalMeals++;
                totalDaysOn++;
            }
        });

        const totalCharge = totalMeals * (monthSettings.lunchRate || 0);

        res.json({
            year: parseInt(year),
            month: parseInt(month),
            startDate: monthSettings.startDate,
            endDate: monthSettings.endDate,
            lunchRate: monthSettings.lunchRate || 0,
            totalDays: dates.length,
            totalDaysOn,
            totalMeals,
            totalCharge,
            holidays: holidays.map(h => ({ date: h.date, name: h.nameBn }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/meals/daily
// @desc    Get all users' meal status for a specific date (Manager+ only)
// @access  Private (Manager+)
router.get('/daily', protect, isManager, async (req, res) => {
    try {
        const { date } = req.query;
        const mealDate = new Date(date);

        // Get all active users
        const User = require('../models/User');
        const users = await User.find({ isActive: true }).select('name email');

        // Get holidays
        const holidays = await Holiday.find({
            date: mealDate,
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);
        const isDefaultOff = isDefaultMealOff(mealDate, holidayDates);

        // Get meals for all users
        const meals = await Meal.find({
            date: mealDate,
            mealType: 'lunch'
        }).populate('user', 'name email');

        // Build response
        const dailyMeals = users.map(user => {
            const meal = meals.find(m => m.user._id.toString() === user._id.toString());

            return {
                user: { _id: user._id, name: user.name, email: user.email },
                isOn: meal ? meal.isOn : !isDefaultOff,
                count: meal ? meal.count : (!isDefaultOff ? 1 : 0),
                isManuallySet: !!meal
            };
        });

        // Calculate totals
        const totalMealsOn = dailyMeals.filter(m => m.isOn).length;
        const totalMealCount = dailyMeals.reduce((sum, m) => sum + m.count, 0);

        res.json({
            date: formatDate(mealDate),
            isDefaultOff,
            isHoliday: holidays.length > 0,
            holidayName: holidays.length > 0 ? holidays[0].nameBn : null,
            totalMealsOn,
            totalMealCount,
            meals: dailyMeals
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
