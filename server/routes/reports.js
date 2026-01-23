const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meal = require('../models/Meal');
const Breakfast = require('../models/Breakfast');
const Transaction = require('../models/Transaction');
const MonthSettings = require('../models/MonthSettings');
const Holiday = require('../models/Holiday');
const { protect, isManager } = require('../middleware/auth');
const {
    getDatesBetween,
    formatDate,
    isDefaultMealOff,
    getDefaultMonthRange
} = require('../utils/dateUtils');

// @route   GET /api/reports/monthly
// @desc    Get monthly report for a user
// @access  Private
router.get('/monthly', protect, async (req, res) => {
    try {
        const { year, month, userId } = req.query;

        let targetUserId = req.user._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            targetUserId = userId;
        }

        // Get user
        const user = await User.findById(targetUserId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = {
                startDate,
                endDate,
                lunchRate: 0,
                dinnerRate: 0
            };
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get lunch meals
        const lunchMeals = await Meal.find({
            user: targetUserId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        // Get dinner meals
        const dinnerMeals = await Meal.find({
            user: targetUserId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'dinner'
        });

        // Get breakfast costs
        const breakfasts = await Breakfast.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            'participants.user': targetUserId
        });

        // Get transactions
        const transactions = await Transaction.find({
            user: targetUserId,
            createdAt: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
        }).sort({ createdAt: -1 });

        // Calculate lunch summary
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        let lunchMealsCount = 0;
        let lunchDaysOn = 0;

        const dailyLunchMeals = dates.map(date => {
            const dateStr = formatDate(date);
            const manualMeal = lunchMeals.find(m => formatDate(m.date) === dateStr);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);
            const holiday = holidays.find(h => formatDate(h.date) === dateStr);

            let isOn, count;
            if (manualMeal) {
                isOn = manualMeal.isOn;
                count = manualMeal.count;
            } else {
                isOn = !isDefaultOff;
                count = isOn ? 1 : 0;
            }

            if (isOn) {
                lunchMealsCount += count;
                lunchDaysOn++;
            }

            return {
                date: dateStr,
                dayName: new Date(date).toLocaleDateString('bn-BD', { weekday: 'long' }),
                isOn,
                count,
                isDefaultOff,
                isHoliday: !!holiday,
                holidayName: holiday ? holiday.nameBn : null
            };
        });

        // Calculate dinner summary
        let dinnerMealsCount = 0;
        let dinnerDaysOn = 0;

        const dailyDinnerMeals = dates.map(date => {
            const dateStr = formatDate(date);
            const manualMeal = dinnerMeals.find(m => formatDate(m.date) === dateStr);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);
            const holiday = holidays.find(h => formatDate(h.date) === dateStr);

            let isOn, count;
            if (manualMeal) {
                isOn = manualMeal.isOn;
                count = manualMeal.count;
            } else {
                isOn = !isDefaultOff;
                count = isOn ? 1 : 0;
            }

            if (isOn) {
                dinnerMealsCount += count;
                dinnerDaysOn++;
            }

            return {
                date: dateStr,
                dayName: new Date(date).toLocaleDateString('bn-BD', { weekday: 'long' }),
                isOn,
                count,
                isDefaultOff,
                isHoliday: !!holiday,
                holidayName: holiday ? holiday.nameBn : null
            };
        });

        // Calculate breakfast summary
        let breakfastTotalCost = 0;
        const breakfastDetails = breakfasts.map(b => {
            const userParticipation = b.participants.find(
                p => p.user.toString() === targetUserId.toString()
            );
            if (userParticipation) {
                breakfastTotalCost += userParticipation.cost;
            }
            return {
                date: formatDate(b.date),
                description: b.description,
                totalCost: b.totalCost,
                myCost: userParticipation ? userParticipation.cost : 0,
                deducted: userParticipation ? userParticipation.deducted : false
            };
        });

        // Calculate totals
        const lunchTotalCharge = lunchMealsCount * (monthSettings.lunchRate || 0);
        const dinnerTotalCharge = dinnerMealsCount * (monthSettings.dinnerRate || 0);

        // Balance summary
        const deposits = transactions.filter(t => t.type === 'deposit');
        const deductions = transactions.filter(t => t.type === 'deduction');

        const totalDeposits = {
            breakfast: deposits.filter(t => t.balanceType === 'breakfast').reduce((sum, t) => sum + t.amount, 0),
            lunch: deposits.filter(t => t.balanceType === 'lunch').reduce((sum, t) => sum + t.amount, 0),
            dinner: deposits.filter(t => t.balanceType === 'dinner').reduce((sum, t) => sum + t.amount, 0)
        };

        const totalDeductions = {
            breakfast: Math.abs(deductions.filter(t => t.balanceType === 'breakfast').reduce((sum, t) => sum + t.amount, 0)),
            lunch: Math.abs(deductions.filter(t => t.balanceType === 'lunch').reduce((sum, t) => sum + t.amount, 0)),
            dinner: Math.abs(deductions.filter(t => t.balanceType === 'dinner').reduce((sum, t) => sum + t.amount, 0))
        };

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                balances: user.balances
            },
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                totalDays: dates.length
            },
            lunch: {
                rate: monthSettings.lunchRate || 0,
                daysOn: lunchDaysOn,
                totalMeals: lunchMealsCount,
                totalCharge: lunchTotalCharge,
                dailyDetails: dailyLunchMeals
            },
            dinner: {
                rate: monthSettings.dinnerRate || 0,
                daysOn: dinnerDaysOn,
                totalMeals: dinnerMealsCount,
                totalCharge: dinnerTotalCharge,
                dailyDetails: dailyDinnerMeals
            },
            breakfast: {
                totalCost: breakfastTotalCost,
                details: breakfastDetails
            },
            transactions: {
                totalDeposits,
                totalDeductions,
                history: transactions
            },
            holidays: holidays.map(h => ({
                date: formatDate(h.date),
                name: h.nameBn
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/all-users
// @desc    Get monthly report for all users (Manager+ only)
// @access  Private (Manager+)
router.get('/all-users', protect, isManager, async (req, res) => {
    try {
        const { year, month } = req.query;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = {
                startDate,
                endDate,
                lunchRate: 0,
                dinnerRate: 0
            };
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get all active users
        const users = await User.find({ isActive: true }).select('-password');

        // Get all lunch meals for the period
        const allLunchMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        // Get all dinner meals for the period
        const allDinnerMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'dinner'
        });

        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        // Calculate for each user
        const userReports = users.map(user => {
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
                    if (lunchMeal.isOn) {
                        totalLunchMeals += lunchMeal.count;
                    }
                } else if (!isDefaultOff) {
                    totalLunchMeals++;
                }

                // Dinner calculation
                const dinnerMeal = userDinnerMeals.find(m => formatDate(m.date) === dateStr);
                if (dinnerMeal) {
                    if (dinnerMeal.isOn) {
                        totalDinnerMeals += dinnerMeal.count;
                    }
                } else if (!isDefaultOff) {
                    totalDinnerMeals++;
                }
            });

            const lunchCharge = totalLunchMeals * (monthSettings.lunchRate || 0);
            const dinnerCharge = totalDinnerMeals * (monthSettings.dinnerRate || 0);

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                lunch: {
                    totalMeals: totalLunchMeals,
                    totalCharge: lunchCharge,
                    balance: user.balances.lunch
                },
                dinner: {
                    totalMeals: totalDinnerMeals,
                    totalCharge: dinnerCharge,
                    balance: user.balances.dinner
                },
                totalCharge: lunchCharge + dinnerCharge
            };
        });

        // Calculate grand totals
        const grandTotalLunchMeals = userReports.reduce((sum, r) => sum + r.lunch.totalMeals, 0);
        const grandTotalDinnerMeals = userReports.reduce((sum, r) => sum + r.dinner.totalMeals, 0);
        const grandTotalLunchCharge = userReports.reduce((sum, r) => sum + r.lunch.totalCharge, 0);
        const grandTotalDinnerCharge = userReports.reduce((sum, r) => sum + r.dinner.totalCharge, 0);

        res.json({
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0,
                dinnerRate: monthSettings.dinnerRate || 0
            },
            users: userReports,
            summary: {
                totalUsers: users.length,
                lunch: {
                    grandTotalMeals: grandTotalLunchMeals,
                    grandTotalCharge: grandTotalLunchCharge
                },
                dinner: {
                    grandTotalMeals: grandTotalDinnerMeals,
                    grandTotalCharge: grandTotalDinnerCharge
                },
                grandTotalCharge: grandTotalLunchCharge + grandTotalDinnerCharge
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/daily
// @desc    Get daily meal report (Manager+ only)
// @access  Private (Manager+)
router.get('/daily', protect, isManager, async (req, res) => {
    try {
        const { date, mealType = 'lunch' } = req.query;
        const reportDate = new Date(date);

        // Validate mealType
        if (!['lunch', 'dinner'].includes(mealType)) {
            return res.status(400).json({ message: 'মিল টাইপ অবৈধ। lunch বা dinner হতে হবে।' });
        }

        // Get all active users
        const users = await User.find({ isActive: true }).select('name email balances');

        // Get holidays
        const holidays = await Holiday.find({
            date: reportDate,
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);
        const isDefaultOff = isDefaultMealOff(reportDate, holidayDates);

        // Get meals for the date
        const meals = await Meal.find({
            date: reportDate,
            mealType
        });

        // Build report
        const userMeals = users.map(user => {
            const meal = meals.find(m => m.user.toString() === user._id.toString());
            const balance = mealType === 'lunch' ? user.balances.lunch : user.balances.dinner;

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                isOn: meal ? meal.isOn : !isDefaultOff,
                count: meal ? meal.count : (!isDefaultOff ? 1 : 0),
                isManuallySet: !!meal,
                balance
            };
        });

        const mealsOn = userMeals.filter(m => m.isOn);
        const totalMealCount = userMeals.reduce((sum, m) => sum + m.count, 0);

        res.json({
            date: formatDate(reportDate),
            mealType,
            dayName: reportDate.toLocaleDateString('bn-BD', { weekday: 'long' }),
            isDefaultOff,
            isHoliday: holidays.length > 0,
            holidayName: holidays.length > 0 ? holidays[0].nameBn : null,
            summary: {
                totalUsers: users.length,
                mealsOn: mealsOn.length,
                mealsOff: users.length - mealsOn.length,
                totalMealCount
            },
            users: userMeals
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
