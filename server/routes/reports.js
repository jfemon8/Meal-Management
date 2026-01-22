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

        // Get meals
        const meals = await Meal.find({
            user: targetUserId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
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

        const dailyMeals = dates.map(date => {
            const dateStr = formatDate(date);
            const manualMeal = meals.find(m => formatDate(m.date) === dateStr);
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
                dailyDetails: dailyMeals
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
                lunchRate: 0
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

        // Get all meals for the period
        const allMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        // Calculate for each user
        const userReports = users.map(user => {
            const userMeals = allMeals.filter(m => m.user.toString() === user._id.toString());
            let totalMeals = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const manualMeal = userMeals.find(m => formatDate(m.date) === dateStr);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);

                if (manualMeal) {
                    if (manualMeal.isOn) {
                        totalMeals += manualMeal.count;
                    }
                } else if (!isDefaultOff) {
                    totalMeals++;
                }
            });

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                totalMeals,
                totalCharge: totalMeals * (monthSettings.lunchRate || 0),
                balance: user.balances.lunch
            };
        });

        // Calculate grand totals
        const grandTotalMeals = userReports.reduce((sum, r) => sum + r.totalMeals, 0);
        const grandTotalCharge = userReports.reduce((sum, r) => sum + r.totalCharge, 0);

        res.json({
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0
            },
            users: userReports,
            summary: {
                totalUsers: users.length,
                grandTotalMeals,
                grandTotalCharge
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
        const { date } = req.query;
        const reportDate = new Date(date);

        // Get all active users
        const users = await User.find({ isActive: true }).select('name email');

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
            mealType: 'lunch'
        });

        // Build report
        const userMeals = users.map(user => {
            const meal = meals.find(m => m.user.toString() === user._id.toString());

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                isOn: meal ? meal.isOn : !isDefaultOff,
                count: meal ? meal.count : (!isDefaultOff ? 1 : 0),
                isManuallySet: !!meal
            };
        });

        const mealsOn = userMeals.filter(m => m.isOn);
        const totalMealCount = userMeals.reduce((sum, m) => sum + m.count, 0);

        res.json({
            date: formatDate(reportDate),
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
