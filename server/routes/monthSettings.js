const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const MonthSettings = require('../models/MonthSettings');
const { protect, isManager } = require('../middleware/auth');
const { formatDateISO, formatDateBn, formatDateTime, nowBD, toBDTime, startOfDayBD, getDefaultMonthRange, isValidDateRange } = require('../utils/dateUtils');

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

// @route   POST /api/month-settings/:id/carry-forward
// @desc    Carry forward balances to next month (Manager+ only)
// @access  Private (Manager+)
router.post('/:id/carry-forward', protect, isManager, async (req, res) => {
    try {
        const settings = await MonthSettings.findById(req.params.id);
        if (!settings) {
            return res.status(404).json({ message: 'মাসের সেটিংস পাওয়া যায়নি' });
        }

        // Must be finalized first
        if (!settings.isFinalized) {
            return res.status(400).json({
                message: 'ক্যারি ফরওয়ার্ড করার আগে মাস ফাইনালাইজ করুন'
            });
        }

        // Check if already carried forward
        if (settings.isCarriedForward) {
            return res.status(400).json({
                message: 'এই মাসের ব্যালেন্স আগেই ক্যারি ফরওয়ার্ড করা হয়েছে'
            });
        }

        // Calculate next month
        let nextYear = settings.year;
        let nextMonth = settings.month + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        // Check if next month settings exist
        let nextMonthSettings = await MonthSettings.findOne({
            year: nextYear,
            month: nextMonth
        });

        if (!nextMonthSettings) {
            // Create next month settings with default values
            const { startDate, endDate } = getDefaultMonthRange(nextYear, nextMonth);
            nextMonthSettings = await MonthSettings.create({
                year: nextYear,
                month: nextMonth,
                startDate,
                endDate,
                lunchRate: settings.lunchRate,
                dinnerRate: settings.dinnerRate,
                createdBy: req.user._id,
                notes: `Auto-created from carry forward of ${settings.year}-${settings.month}`
            });
        }

        // Get all active users
        const User = require('../models/User');
        const Transaction = require('../models/Transaction');
        const users = await User.find({ isActive: true });

        const carryForwardResults = [];
        const transactions = [];

        for (const user of users) {
            const userResult = {
                userId: user._id,
                userName: user.name,
                balances: {}
            };

            // Process each balance type
            for (const balanceType of ['breakfast', 'lunch', 'dinner']) {
                const currentBalance = user.balances[balanceType].amount;

                if (currentBalance !== 0) {
                    // Create carry forward transaction (adjustment type)
                    const transaction = await Transaction.create({
                        user: user._id,
                        type: 'adjustment',
                        balanceType,
                        amount: 0, // No actual change, just a record
                        previousBalance: currentBalance,
                        newBalance: currentBalance,
                        description: `ক্যারি ফরওয়ার্ড: ${settings.year}-${settings.month} থেকে ${nextYear}-${nextMonth}`,
                        reference: settings._id,
                        referenceModel: 'MonthSettings',
                        performedBy: req.user._id
                    });

                    transactions.push(transaction);
                    userResult.balances[balanceType] = {
                        carriedForward: currentBalance,
                        type: currentBalance >= 0 ? 'advance' : 'due'
                    };
                } else {
                    userResult.balances[balanceType] = {
                        carriedForward: 0,
                        type: 'settled'
                    };
                }
            }

            carryForwardResults.push(userResult);
        }

        // Mark as carried forward
        settings.isCarriedForward = true;
        settings.carriedForwardAt = new Date();
        settings.carriedForwardBy = req.user._id;
        await settings.save();

        res.json({
            message: 'ব্যালেন্স সফলভাবে ক্যারি ফরওয়ার্ড করা হয়েছে',
            fromMonth: {
                year: settings.year,
                month: settings.month
            },
            toMonth: {
                year: nextYear,
                month: nextMonth
            },
            usersProcessed: users.length,
            transactionsCreated: transactions.length,
            results: carryForwardResults
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/month-settings/:id/preview
// @desc    Preview month calculation before finalizing (Manager+ only)
// @access  Private (Manager+)
router.get('/:id/preview', protect, isManager, async (req, res) => {
    try {
        const settings = await MonthSettings.findById(req.params.id);
        if (!settings) {
            return res.status(404).json({ message: 'মাসের সেটিংস পাওয়া যায়নি' });
        }

        const User = require('../models/User');
        const Meal = require('../models/Meal');
        const Breakfast = require('../models/Breakfast');
        const Holiday = require('../models/Holiday');
        const { getDatesBetween, formatDate, isDefaultMealOff } = require('../utils/dateUtils');

        // Get holidays for this period
        const holidays = await Holiday.find({
            date: { $gte: settings.startDate, $lte: settings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get all active users
        const users = await User.find({ isActive: true }).select('name email balances');

        // Get all meals for the period
        const allLunchMeals = await Meal.find({
            date: { $gte: settings.startDate, $lte: settings.endDate },
            mealType: 'lunch'
        });

        const allDinnerMeals = await Meal.find({
            date: { $gte: settings.startDate, $lte: settings.endDate },
            mealType: 'dinner'
        });

        // Get all breakfast costs for the period
        const allBreakfasts = await Breakfast.find({
            date: { $gte: settings.startDate, $lte: settings.endDate }
        });

        const dates = getDatesBetween(settings.startDate, settings.endDate);

        // Calculate for each user
        const userPreviews = users.map(user => {
            const userLunchMeals = allLunchMeals.filter(m => m.user.toString() === user._id.toString());
            const userDinnerMeals = allDinnerMeals.filter(m => m.user.toString() === user._id.toString());

            let totalLunchMeals = 0;
            let totalDinnerMeals = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);

                // Lunch calculation
                const lunchMeal = userLunchMeals.find(m => formatDate(m.date) === dateStr);
                if (lunchMeal) {
                    if (lunchMeal.isOn) totalLunchMeals += lunchMeal.count;
                } else if (!isDefaultOff) {
                    totalLunchMeals++;
                }

                // Dinner calculation
                const dinnerMeal = userDinnerMeals.find(m => formatDate(m.date) === dateStr);
                if (dinnerMeal) {
                    if (dinnerMeal.isOn) totalDinnerMeals += dinnerMeal.count;
                } else if (!isDefaultOff) {
                    totalDinnerMeals++;
                }
            });

            // Calculate breakfast cost for user
            let breakfastCost = 0;
            allBreakfasts.forEach(b => {
                const participation = b.participants.find(p => p.user.toString() === user._id.toString());
                if (participation) {
                    breakfastCost += participation.cost;
                }
            });

            // Calculate charges
            const lunchCharge = totalLunchMeals * (settings.lunchRate || 0);
            const dinnerCharge = totalDinnerMeals * (settings.dinnerRate || 0);
            const totalCharge = lunchCharge + dinnerCharge + breakfastCost;

            // Current balances
            const lunchBalance = user.balances?.lunch?.amount || 0;
            const dinnerBalance = user.balances?.dinner?.amount || 0;
            const breakfastBalance = user.balances?.breakfast?.amount || 0;
            const totalBalance = lunchBalance + dinnerBalance + breakfastBalance;

            // Due/Advance calculation
            const lunchDue = lunchCharge - lunchBalance;
            const dinnerDue = dinnerCharge - dinnerBalance;
            const breakfastDue = breakfastCost - breakfastBalance;
            const totalDue = totalCharge - totalBalance;

            return {
                userId: user._id,
                name: user.name,
                email: user.email,
                lunch: {
                    meals: totalLunchMeals,
                    charge: lunchCharge,
                    balance: lunchBalance,
                    due: lunchDue,
                    status: lunchDue > 0 ? 'due' : lunchDue < 0 ? 'advance' : 'settled'
                },
                dinner: {
                    meals: totalDinnerMeals,
                    charge: dinnerCharge,
                    balance: dinnerBalance,
                    due: dinnerDue,
                    status: dinnerDue > 0 ? 'due' : dinnerDue < 0 ? 'advance' : 'settled'
                },
                breakfast: {
                    cost: breakfastCost,
                    balance: breakfastBalance,
                    due: breakfastDue,
                    status: breakfastDue > 0 ? 'due' : breakfastDue < 0 ? 'advance' : 'settled'
                },
                total: {
                    charge: totalCharge,
                    balance: totalBalance,
                    due: totalDue,
                    status: totalDue > 0 ? 'due' : totalDue < 0 ? 'advance' : 'settled'
                }
            };
        });

        // Calculate grand totals
        const grandTotals = {
            totalUsers: users.length,
            lunch: {
                totalMeals: userPreviews.reduce((sum, u) => sum + u.lunch.meals, 0),
                totalCharge: userPreviews.reduce((sum, u) => sum + u.lunch.charge, 0),
                totalBalance: userPreviews.reduce((sum, u) => sum + u.lunch.balance, 0),
                totalDue: userPreviews.reduce((sum, u) => sum + u.lunch.due, 0)
            },
            dinner: {
                totalMeals: userPreviews.reduce((sum, u) => sum + u.dinner.meals, 0),
                totalCharge: userPreviews.reduce((sum, u) => sum + u.dinner.charge, 0),
                totalBalance: userPreviews.reduce((sum, u) => sum + u.dinner.balance, 0),
                totalDue: userPreviews.reduce((sum, u) => sum + u.dinner.due, 0)
            },
            breakfast: {
                totalCost: userPreviews.reduce((sum, u) => sum + u.breakfast.cost, 0),
                totalBalance: userPreviews.reduce((sum, u) => sum + u.breakfast.balance, 0),
                totalDue: userPreviews.reduce((sum, u) => sum + u.breakfast.due, 0)
            },
            overall: {
                totalCharge: userPreviews.reduce((sum, u) => sum + u.total.charge, 0),
                totalBalance: userPreviews.reduce((sum, u) => sum + u.total.balance, 0),
                totalDue: userPreviews.reduce((sum, u) => sum + u.total.due, 0),
                usersWithDue: userPreviews.filter(u => u.total.due > 0).length,
                usersWithAdvance: userPreviews.filter(u => u.total.due < 0).length,
                usersSettled: userPreviews.filter(u => u.total.due === 0).length
            }
        };

        res.json({
            settings: {
                _id: settings._id,
                year: settings.year,
                month: settings.month,
                startDate: settings.startDate,
                endDate: settings.endDate,
                lunchRate: settings.lunchRate,
                dinnerRate: settings.dinnerRate,
                totalDays: dates.length,
                isFinalized: settings.isFinalized
            },
            grandTotals,
            userPreviews: userPreviews.sort((a, b) => b.total.due - a.total.due), // Sort by due (highest first)
            holidays: holidays.map(h => ({ date: formatDate(h.date), name: h.nameBn }))
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
        const today = nowBD();
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
