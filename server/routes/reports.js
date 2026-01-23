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

        // Calculate Due/Advance for each balance type
        const currentLunchBalance = user.balances.lunch.amount;
        const currentDinnerBalance = user.balances.dinner.amount;
        const currentBreakfastBalance = user.balances.breakfast.amount;

        // Due = totalCharge - currentBalance (positive = due, negative = advance)
        const lunchDueAdvance = lunchTotalCharge - currentLunchBalance;
        const dinnerDueAdvance = dinnerTotalCharge - currentDinnerBalance;
        const breakfastDueAdvance = breakfastTotalCost - currentBreakfastBalance;

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
                totalDays: dates.length,
                isFinalized: monthSettings.isFinalized || false
            },
            lunch: {
                rate: monthSettings.lunchRate || 0,
                daysOn: lunchDaysOn,
                totalMeals: lunchMealsCount,
                totalCharge: lunchTotalCharge,
                currentBalance: currentLunchBalance,
                dueAdvance: {
                    amount: Math.abs(lunchDueAdvance),
                    type: lunchDueAdvance > 0 ? 'due' : lunchDueAdvance < 0 ? 'advance' : 'settled'
                },
                dailyDetails: dailyLunchMeals
            },
            dinner: {
                rate: monthSettings.dinnerRate || 0,
                daysOn: dinnerDaysOn,
                totalMeals: dinnerMealsCount,
                totalCharge: dinnerTotalCharge,
                currentBalance: currentDinnerBalance,
                dueAdvance: {
                    amount: Math.abs(dinnerDueAdvance),
                    type: dinnerDueAdvance > 0 ? 'due' : dinnerDueAdvance < 0 ? 'advance' : 'settled'
                },
                dailyDetails: dailyDinnerMeals
            },
            breakfast: {
                totalCost: breakfastTotalCost,
                currentBalance: currentBreakfastBalance,
                dueAdvance: {
                    amount: Math.abs(breakfastDueAdvance),
                    type: breakfastDueAdvance > 0 ? 'due' : breakfastDueAdvance < 0 ? 'advance' : 'settled'
                },
                details: breakfastDetails
            },
            // Overall summary
            summary: {
                totalCharge: lunchTotalCharge + dinnerTotalCharge + breakfastTotalCost,
                totalBalance: currentLunchBalance + currentDinnerBalance + currentBreakfastBalance,
                netDueAdvance: {
                    amount: Math.abs((lunchDueAdvance + dinnerDueAdvance + breakfastDueAdvance)),
                    type: (lunchDueAdvance + dinnerDueAdvance + breakfastDueAdvance) > 0 ? 'due' :
                          (lunchDueAdvance + dinnerDueAdvance + breakfastDueAdvance) < 0 ? 'advance' : 'settled'
                }
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

            // Calculate due/advance
            const lunchBalance = user.balances.lunch.amount;
            const dinnerBalance = user.balances.dinner.amount;
            const lunchDue = lunchCharge - lunchBalance;
            const dinnerDue = dinnerCharge - dinnerBalance;
            const totalDue = lunchDue + dinnerDue;

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email
                },
                lunch: {
                    totalMeals: totalLunchMeals,
                    totalCharge: lunchCharge,
                    balance: user.balances.lunch,
                    dueAdvance: {
                        amount: Math.abs(lunchDue),
                        type: lunchDue > 0 ? 'due' : lunchDue < 0 ? 'advance' : 'settled'
                    }
                },
                dinner: {
                    totalMeals: totalDinnerMeals,
                    totalCharge: dinnerCharge,
                    balance: user.balances.dinner,
                    dueAdvance: {
                        amount: Math.abs(dinnerDue),
                        type: dinnerDue > 0 ? 'due' : dinnerDue < 0 ? 'advance' : 'settled'
                    }
                },
                totalCharge: lunchCharge + dinnerCharge,
                totalDueAdvance: {
                    amount: Math.abs(totalDue),
                    type: totalDue > 0 ? 'due' : totalDue < 0 ? 'advance' : 'settled'
                }
            };
        });

        // Calculate grand totals
        const grandTotalLunchMeals = userReports.reduce((sum, r) => sum + r.lunch.totalMeals, 0);
        const grandTotalDinnerMeals = userReports.reduce((sum, r) => sum + r.dinner.totalMeals, 0);
        const grandTotalLunchCharge = userReports.reduce((sum, r) => sum + r.lunch.totalCharge, 0);
        const grandTotalDinnerCharge = userReports.reduce((sum, r) => sum + r.dinner.totalCharge, 0);

        // Calculate total due/advance
        const usersWithDue = userReports.filter(r => r.totalDueAdvance.type === 'due');
        const usersWithAdvance = userReports.filter(r => r.totalDueAdvance.type === 'advance');
        const totalDueAmount = usersWithDue.reduce((sum, r) => sum + r.totalDueAdvance.amount, 0);
        const totalAdvanceAmount = usersWithAdvance.reduce((sum, r) => sum + r.totalDueAdvance.amount, 0);
        const netAmount = totalDueAmount - totalAdvanceAmount;

        res.json({
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0,
                dinnerRate: monthSettings.dinnerRate || 0,
                isFinalized: monthSettings.isFinalized || false
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
                grandTotalCharge: grandTotalLunchCharge + grandTotalDinnerCharge,
                dueAdvanceSummary: {
                    usersWithDue: usersWithDue.length,
                    usersWithAdvance: usersWithAdvance.length,
                    usersSettled: userReports.length - usersWithDue.length - usersWithAdvance.length,
                    totalDueAmount,
                    totalAdvanceAmount,
                    netAmount: Math.abs(netAmount),
                    netType: netAmount > 0 ? 'due' : netAmount < 0 ? 'advance' : 'settled'
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/wallet-summary
// @desc    Get wallet/balance summary for user
// @access  Private
router.get('/wallet-summary', protect, async (req, res) => {
    try {
        const { userId } = req.query;

        let targetUserId = req.user._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            targetUserId = userId;
        }

        const user = await User.findById(targetUserId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Get recent transactions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTransactions = await Transaction.find({
            user: targetUserId,
            createdAt: { $gte: thirtyDaysAgo }
        }).sort({ createdAt: -1 }).limit(20);

        // Get transaction stats
        const transactionStats = await Transaction.aggregate([
            { $match: { user: user._id } },
            {
                $group: {
                    _id: { type: '$type', balanceType: '$balanceType' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Calculate totals by balance type
        const balanceSummary = {
            breakfast: {
                current: user.balances.breakfast.amount,
                isFrozen: user.balances.breakfast.isFrozen,
                totalDeposits: 0,
                totalDeductions: 0,
                transactionCount: 0
            },
            lunch: {
                current: user.balances.lunch.amount,
                isFrozen: user.balances.lunch.isFrozen,
                totalDeposits: 0,
                totalDeductions: 0,
                transactionCount: 0
            },
            dinner: {
                current: user.balances.dinner.amount,
                isFrozen: user.balances.dinner.isFrozen,
                totalDeposits: 0,
                totalDeductions: 0,
                transactionCount: 0
            }
        };

        transactionStats.forEach(stat => {
            const bt = stat._id.balanceType;
            if (stat._id.type === 'deposit') {
                balanceSummary[bt].totalDeposits += stat.total;
            } else if (stat._id.type === 'deduction') {
                balanceSummary[bt].totalDeductions += Math.abs(stat.total);
            }
            balanceSummary[bt].transactionCount += stat.count;
        });

        // Overall totals
        const totalBalance = user.balances.breakfast.amount +
                            user.balances.lunch.amount +
                            user.balances.dinner.amount;

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            },
            balances: balanceSummary,
            totalBalance,
            recentTransactions,
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/top-consumers
// @desc    Get top meal consumers (Manager+ only)
// @access  Private (Manager+)
router.get('/top-consumers', protect, isManager, async (req, res) => {
    try {
        const { year, month, mealType = 'all', limit = 10 } = req.query;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = { startDate, endDate, lunchRate: 0, dinnerRate: 0 };
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get all active users
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('name email');
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        // Get meals based on type
        const mealQuery = {
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
        };
        if (mealType !== 'all') {
            mealQuery.mealType = mealType;
        }
        const allMeals = await Meal.find(mealQuery);

        // Calculate consumption for each user
        const consumption = users.map(user => {
            let lunchCount = 0;
            let dinnerCount = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);

                // Lunch
                if (mealType === 'all' || mealType === 'lunch') {
                    const lunchMeal = allMeals.find(m =>
                        m.user.toString() === user._id.toString() &&
                        m.mealType === 'lunch' &&
                        formatDate(m.date) === dateStr
                    );
                    if (lunchMeal) {
                        if (lunchMeal.isOn) lunchCount += lunchMeal.count;
                    } else if (!isDefaultOff) {
                        lunchCount++;
                    }
                }

                // Dinner
                if (mealType === 'all' || mealType === 'dinner') {
                    const dinnerMeal = allMeals.find(m =>
                        m.user.toString() === user._id.toString() &&
                        m.mealType === 'dinner' &&
                        formatDate(m.date) === dateStr
                    );
                    if (dinnerMeal) {
                        if (dinnerMeal.isOn) dinnerCount += dinnerMeal.count;
                    } else if (!isDefaultOff) {
                        dinnerCount++;
                    }
                }
            });

            const lunchCost = lunchCount * (monthSettings.lunchRate || 0);
            const dinnerCost = dinnerCount * (monthSettings.dinnerRate || 0);

            return {
                user: { _id: user._id, name: user.name, email: user.email },
                lunch: { count: lunchCount, cost: lunchCost },
                dinner: { count: dinnerCount, cost: dinnerCost },
                total: { count: lunchCount + dinnerCount, cost: lunchCost + dinnerCost }
            };
        });

        // Sort by total count/cost
        consumption.sort((a, b) => b.total.count - a.total.count);

        res.json({
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate
            },
            mealType,
            topConsumers: consumption.slice(0, parseInt(limit)),
            totalUsers: users.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/defaulters
// @desc    Get users with due balance (Manager+ only)
// @access  Private (Manager+)
router.get('/defaulters', protect, isManager, async (req, res) => {
    try {
        const { year, month, threshold = 0, balanceType = 'all' } = req.query;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = { startDate, endDate, lunchRate: 0, dinnerRate: 0 };
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get all active users with balances
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } })
            .select('name email phone balances');

        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        const allMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
        });

        const defaulters = [];

        users.forEach(user => {
            let lunchCount = 0;
            let dinnerCount = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);

                // Lunch
                const lunchMeal = allMeals.find(m =>
                    m.user.toString() === user._id.toString() &&
                    m.mealType === 'lunch' &&
                    formatDate(m.date) === dateStr
                );
                if (lunchMeal) {
                    if (lunchMeal.isOn) lunchCount += lunchMeal.count;
                } else if (!isDefaultOff) {
                    lunchCount++;
                }

                // Dinner
                const dinnerMeal = allMeals.find(m =>
                    m.user.toString() === user._id.toString() &&
                    m.mealType === 'dinner' &&
                    formatDate(m.date) === dateStr
                );
                if (dinnerMeal) {
                    if (dinnerMeal.isOn) dinnerCount += dinnerMeal.count;
                } else if (!isDefaultOff) {
                    dinnerCount++;
                }
            });

            const lunchCharge = lunchCount * (monthSettings.lunchRate || 0);
            const dinnerCharge = dinnerCount * (monthSettings.dinnerRate || 0);

            const lunchDue = lunchCharge - user.balances.lunch.amount;
            const dinnerDue = dinnerCharge - user.balances.dinner.amount;
            const breakfastDue = -user.balances.breakfast.amount; // Negative balance = due
            const totalDue = lunchDue + dinnerDue + breakfastDue;

            // Check if user is a defaulter based on threshold and balance type
            let isDefaulter = false;
            if (balanceType === 'all') {
                isDefaulter = totalDue > parseFloat(threshold);
            } else if (balanceType === 'lunch') {
                isDefaulter = lunchDue > parseFloat(threshold);
            } else if (balanceType === 'dinner') {
                isDefaulter = dinnerDue > parseFloat(threshold);
            } else if (balanceType === 'breakfast') {
                isDefaulter = breakfastDue > parseFloat(threshold);
            }

            if (isDefaulter) {
                defaulters.push({
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone
                    },
                    balances: {
                        breakfast: user.balances.breakfast.amount,
                        lunch: user.balances.lunch.amount,
                        dinner: user.balances.dinner.amount
                    },
                    charges: {
                        lunch: lunchCharge,
                        dinner: dinnerCharge
                    },
                    due: {
                        breakfast: breakfastDue > 0 ? breakfastDue : 0,
                        lunch: lunchDue > 0 ? lunchDue : 0,
                        dinner: dinnerDue > 0 ? dinnerDue : 0,
                        total: totalDue > 0 ? totalDue : 0
                    }
                });
            }
        });

        // Sort by total due (highest first)
        defaulters.sort((a, b) => b.due.total - a.due.total);

        const totalDueAmount = defaulters.reduce((sum, d) => sum + d.due.total, 0);

        res.json({
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate
            },
            threshold: parseFloat(threshold),
            balanceType,
            defaulters,
            summary: {
                totalDefaulters: defaulters.length,
                totalUsers: users.length,
                totalDueAmount,
                defaulterPercentage: ((defaulters.length / users.length) * 100).toFixed(1)
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

// @route   GET /api/reports/export/csv
// @desc    Export report as CSV (Manager+ only)
// @access  Private (Manager+)
router.get('/export/csv', protect, isManager, async (req, res) => {
    try {
        const { year, month, reportType = 'all-users' } = req.query;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = { startDate, endDate, lunchRate: 0, dinnerRate: 0 };
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        // Get all active users
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } })
            .select('name email phone balances');

        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        const allMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
        });

        // Build CSV data
        let csvContent = '';

        if (reportType === 'all-users') {
            // Header
            csvContent = 'নাম,ইমেইল,লাঞ্চ মিল,লাঞ্চ চার্জ,লাঞ্চ ব্যালেন্স,লাঞ্চ বকেয়া,ডিনার মিল,ডিনার চার্জ,ডিনার ব্যালেন্স,ডিনার বকেয়া,মোট চার্জ,মোট বকেয়া\n';

            users.forEach(user => {
                let lunchCount = 0;
                let dinnerCount = 0;

                dates.forEach(date => {
                    const dateStr = formatDate(date);
                    const isDefaultOff = isDefaultMealOff(date, holidayDates);

                    const lunchMeal = allMeals.find(m =>
                        m.user.toString() === user._id.toString() &&
                        m.mealType === 'lunch' &&
                        formatDate(m.date) === dateStr
                    );
                    if (lunchMeal) {
                        if (lunchMeal.isOn) lunchCount += lunchMeal.count;
                    } else if (!isDefaultOff) {
                        lunchCount++;
                    }

                    const dinnerMeal = allMeals.find(m =>
                        m.user.toString() === user._id.toString() &&
                        m.mealType === 'dinner' &&
                        formatDate(m.date) === dateStr
                    );
                    if (dinnerMeal) {
                        if (dinnerMeal.isOn) dinnerCount += dinnerMeal.count;
                    } else if (!isDefaultOff) {
                        dinnerCount++;
                    }
                });

                const lunchCharge = lunchCount * (monthSettings.lunchRate || 0);
                const dinnerCharge = dinnerCount * (monthSettings.dinnerRate || 0);
                const lunchDue = Math.max(0, lunchCharge - user.balances.lunch.amount);
                const dinnerDue = Math.max(0, dinnerCharge - user.balances.dinner.amount);
                const totalCharge = lunchCharge + dinnerCharge;
                const totalDue = lunchDue + dinnerDue;

                csvContent += `"${user.name}","${user.email}",${lunchCount},${lunchCharge},${user.balances.lunch.amount},${lunchDue},${dinnerCount},${dinnerCharge},${user.balances.dinner.amount},${dinnerDue},${totalCharge},${totalDue}\n`;
            });
        } else if (reportType === 'defaulters') {
            csvContent = 'নাম,ইমেইল,ফোন,ব্রেকফাস্ট বকেয়া,লাঞ্চ বকেয়া,ডিনার বকেয়া,মোট বকেয়া\n';

            users.forEach(user => {
                let lunchCount = 0;
                let dinnerCount = 0;

                dates.forEach(date => {
                    const dateStr = formatDate(date);
                    const isDefaultOff = isDefaultMealOff(date, holidayDates);

                    const lunchMeal = allMeals.find(m =>
                        m.user.toString() === user._id.toString() &&
                        m.mealType === 'lunch' &&
                        formatDate(m.date) === dateStr
                    );
                    if (lunchMeal) {
                        if (lunchMeal.isOn) lunchCount += lunchMeal.count;
                    } else if (!isDefaultOff) {
                        lunchCount++;
                    }

                    const dinnerMeal = allMeals.find(m =>
                        m.user.toString() === user._id.toString() &&
                        m.mealType === 'dinner' &&
                        formatDate(m.date) === dateStr
                    );
                    if (dinnerMeal) {
                        if (dinnerMeal.isOn) dinnerCount += dinnerMeal.count;
                    } else if (!isDefaultOff) {
                        dinnerCount++;
                    }
                });

                const lunchCharge = lunchCount * (monthSettings.lunchRate || 0);
                const dinnerCharge = dinnerCount * (monthSettings.dinnerRate || 0);
                const lunchDue = Math.max(0, lunchCharge - user.balances.lunch.amount);
                const dinnerDue = Math.max(0, dinnerCharge - user.balances.dinner.amount);
                const breakfastDue = Math.max(0, -user.balances.breakfast.amount);
                const totalDue = lunchDue + dinnerDue + breakfastDue;

                if (totalDue > 0) {
                    csvContent += `"${user.name}","${user.email}","${user.phone || ''}",${breakfastDue},${lunchDue},${dinnerDue},${totalDue}\n`;
                }
            });
        }

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=report-${year}-${month}-${reportType}.csv`);
        // Add BOM for Excel UTF-8 compatibility
        res.send('\uFEFF' + csvContent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/export/json
// @desc    Export report as JSON for PDF generation on client
// @access  Private (Manager+)
router.get('/export/json', protect, isManager, async (req, res) => {
    try {
        const { year, month, reportType = 'all-users' } = req.query;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = { startDate, endDate, lunchRate: 0, dinnerRate: 0 };
        }

        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        const users = await User.find({ isActive: true, isDeleted: { $ne: true } })
            .select('name email phone balances');

        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        const allMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
        });

        const reportData = {
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0,
                dinnerRate: monthSettings.dinnerRate || 0
            },
            generatedAt: new Date(),
            generatedBy: req.user.name,
            reportType,
            data: []
        };

        users.forEach(user => {
            let lunchCount = 0;
            let dinnerCount = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);

                const lunchMeal = allMeals.find(m =>
                    m.user.toString() === user._id.toString() &&
                    m.mealType === 'lunch' &&
                    formatDate(m.date) === dateStr
                );
                if (lunchMeal) {
                    if (lunchMeal.isOn) lunchCount += lunchMeal.count;
                } else if (!isDefaultOff) {
                    lunchCount++;
                }

                const dinnerMeal = allMeals.find(m =>
                    m.user.toString() === user._id.toString() &&
                    m.mealType === 'dinner' &&
                    formatDate(m.date) === dateStr
                );
                if (dinnerMeal) {
                    if (dinnerMeal.isOn) dinnerCount += dinnerMeal.count;
                } else if (!isDefaultOff) {
                    dinnerCount++;
                }
            });

            const lunchCharge = lunchCount * (monthSettings.lunchRate || 0);
            const dinnerCharge = dinnerCount * (monthSettings.dinnerRate || 0);
            const lunchDue = lunchCharge - user.balances.lunch.amount;
            const dinnerDue = dinnerCharge - user.balances.dinner.amount;
            const breakfastDue = -user.balances.breakfast.amount;
            const totalDue = lunchDue + dinnerDue + breakfastDue;

            const userData = {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                lunch: {
                    count: lunchCount,
                    charge: lunchCharge,
                    balance: user.balances.lunch.amount,
                    due: Math.max(0, lunchDue)
                },
                dinner: {
                    count: dinnerCount,
                    charge: dinnerCharge,
                    balance: user.balances.dinner.amount,
                    due: Math.max(0, dinnerDue)
                },
                breakfast: {
                    balance: user.balances.breakfast.amount,
                    due: Math.max(0, breakfastDue)
                },
                totalCharge: lunchCharge + dinnerCharge,
                totalDue: Math.max(0, totalDue),
                status: totalDue > 0 ? 'due' : totalDue < 0 ? 'advance' : 'settled'
            };

            if (reportType === 'defaulters') {
                if (totalDue > 0) {
                    reportData.data.push(userData);
                }
            } else {
                reportData.data.push(userData);
            }
        });

        // Sort by name for all-users, by due for defaulters
        if (reportType === 'defaulters') {
            reportData.data.sort((a, b) => b.totalDue - a.totalDue);
        } else {
            reportData.data.sort((a, b) => a.name.localeCompare(b.name, 'bn'));
        }

        // Calculate summary
        reportData.summary = {
            totalUsers: reportData.data.length,
            totalLunchMeals: reportData.data.reduce((sum, u) => sum + u.lunch.count, 0),
            totalDinnerMeals: reportData.data.reduce((sum, u) => sum + u.dinner.count, 0),
            totalLunchCharge: reportData.data.reduce((sum, u) => sum + u.lunch.charge, 0),
            totalDinnerCharge: reportData.data.reduce((sum, u) => sum + u.dinner.charge, 0),
            totalDue: reportData.data.reduce((sum, u) => sum + u.totalDue, 0),
            usersWithDue: reportData.data.filter(u => u.status === 'due').length,
            usersWithAdvance: reportData.data.filter(u => u.status === 'advance').length
        };

        res.json(reportData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/user/:userId/monthly
// @desc    Get monthly report for specific user (printable format)
// @access  Private
router.get('/user/:userId/monthly', protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;

        // Check permission - user can only see their own, Manager+ can see all
        if (userId !== req.user._id.toString() && !['manager', 'admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'অননুমোদিত অ্যাক্সেস' });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        let monthSettings = await MonthSettings.findOne({
            year: parseInt(year),
            month: parseInt(month)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year), parseInt(month));
            monthSettings = { startDate, endDate, lunchRate: 0, dinnerRate: 0 };
        }

        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);

        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        // Get meals
        const lunchMeals = await Meal.find({
            user: userId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        const dinnerMeals = await Meal.find({
            user: userId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'dinner'
        });

        // Get transactions
        const transactions = await Transaction.find({
            user: userId,
            createdAt: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
        }).sort({ createdAt: 1 });

        // Build daily details
        const dailyDetails = dates.map(date => {
            const dateStr = formatDate(date);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);
            const holiday = holidays.find(h => formatDate(h.date) === dateStr);

            const lunchMeal = lunchMeals.find(m => formatDate(m.date) === dateStr);
            const dinnerMeal = dinnerMeals.find(m => formatDate(m.date) === dateStr);

            const lunchOn = lunchMeal ? lunchMeal.isOn : !isDefaultOff;
            const dinnerOn = dinnerMeal ? dinnerMeal.isOn : !isDefaultOff;
            const lunchCount = lunchMeal ? (lunchMeal.isOn ? lunchMeal.count : 0) : (!isDefaultOff ? 1 : 0);
            const dinnerCount = dinnerMeal ? (dinnerMeal.isOn ? dinnerMeal.count : 0) : (!isDefaultOff ? 1 : 0);

            return {
                date: dateStr,
                dayName: new Date(date).toLocaleDateString('bn-BD', { weekday: 'short' }),
                isHoliday: !!holiday,
                holidayName: holiday?.nameBn,
                isWeekend: isDefaultOff && !holiday,
                lunch: { isOn: lunchOn, count: lunchCount },
                dinner: { isOn: dinnerOn, count: dinnerCount }
            };
        });

        // Calculate totals
        const totalLunch = dailyDetails.reduce((sum, d) => sum + d.lunch.count, 0);
        const totalDinner = dailyDetails.reduce((sum, d) => sum + d.dinner.count, 0);
        const lunchCharge = totalLunch * (monthSettings.lunchRate || 0);
        const dinnerCharge = totalDinner * (monthSettings.dinnerRate || 0);

        res.json({
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone
            },
            period: {
                year: parseInt(year),
                month: parseInt(month),
                monthName: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' }),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                totalDays: dates.length
            },
            rates: {
                lunch: monthSettings.lunchRate || 0,
                dinner: monthSettings.dinnerRate || 0
            },
            dailyDetails,
            summary: {
                lunch: {
                    totalMeals: totalLunch,
                    rate: monthSettings.lunchRate || 0,
                    charge: lunchCharge,
                    balance: user.balances.lunch.amount,
                    due: Math.max(0, lunchCharge - user.balances.lunch.amount)
                },
                dinner: {
                    totalMeals: totalDinner,
                    rate: monthSettings.dinnerRate || 0,
                    charge: dinnerCharge,
                    balance: user.balances.dinner.amount,
                    due: Math.max(0, dinnerCharge - user.balances.dinner.amount)
                },
                breakfast: {
                    balance: user.balances.breakfast.amount,
                    due: Math.max(0, -user.balances.breakfast.amount)
                },
                grandTotal: {
                    charge: lunchCharge + dinnerCharge,
                    balance: user.balances.lunch.amount + user.balances.dinner.amount + user.balances.breakfast.amount,
                    due: Math.max(0, (lunchCharge + dinnerCharge) - (user.balances.lunch.amount + user.balances.dinner.amount))
                }
            },
            transactions: transactions.map(t => ({
                date: t.createdAt,
                type: t.type,
                balanceType: t.balanceType,
                amount: t.amount,
                description: t.description
            })),
            generatedAt: new Date(),
            isFinalized: monthSettings.isFinalized || false
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/manager-dashboard
// @desc    Get manager dashboard statistics (Manager+ only)
// @access  Private (Manager+)
router.get('/manager-dashboard', protect, isManager, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({ year, month });
        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(year, month);
            monthSettings = { startDate, endDate, lunchRate: 0, dinnerRate: 0 };
        }

        // Get holidays for today
        const todayHolidays = await Holiday.find({
            date: today,
            isActive: true
        });
        const isTodayHoliday = todayHolidays.length > 0;
        const isTodayDefaultOff = isDefaultMealOff(today, todayHolidays.map(h => h.date));

        // Get all active users
        const activeUsers = await User.find({ isActive: true, isDeleted: { $ne: true } })
            .select('name balances');
        const totalUsers = activeUsers.length;

        // ====== 1. Today's Lunch Meal Count ======
        const todayLunchMeals = await Meal.find({
            date: today,
            mealType: 'lunch'
        });

        let todayLunchOn = 0;
        let todayLunchTotal = 0;

        activeUsers.forEach(user => {
            const userMeal = todayLunchMeals.find(m => m.user.toString() === user._id.toString());
            if (userMeal) {
                if (userMeal.isOn) {
                    todayLunchOn++;
                    todayLunchTotal += userMeal.count;
                }
            } else if (!isTodayDefaultOff) {
                // Default ON if not a holiday/Friday/odd Saturday
                todayLunchOn++;
                todayLunchTotal++;
            }
        });

        // Today's Dinner Count
        const todayDinnerMeals = await Meal.find({
            date: today,
            mealType: 'dinner'
        });

        let todayDinnerOn = 0;
        let todayDinnerTotal = 0;

        activeUsers.forEach(user => {
            const userMeal = todayDinnerMeals.find(m => m.user.toString() === user._id.toString());
            if (userMeal) {
                if (userMeal.isOn) {
                    todayDinnerOn++;
                    todayDinnerTotal += userMeal.count;
                }
            } else if (!isTodayDefaultOff) {
                todayDinnerOn++;
                todayDinnerTotal++;
            }
        });

        // ====== 2. Monthly Meal Count (User-wise) ======
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        const allLunchMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        const allDinnerMeals = await Meal.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'dinner'
        });

        const userMealCounts = activeUsers.map(user => {
            let lunchCount = 0;
            let dinnerCount = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isOff = isDefaultMealOff(date, holidayDates);

                // Lunch
                const lunchMeal = allLunchMeals.find(m =>
                    m.user.toString() === user._id.toString() &&
                    formatDate(m.date) === dateStr
                );
                if (lunchMeal) {
                    if (lunchMeal.isOn) lunchCount += lunchMeal.count;
                } else if (!isOff) {
                    lunchCount++;
                }

                // Dinner
                const dinnerMeal = allDinnerMeals.find(m =>
                    m.user.toString() === user._id.toString() &&
                    formatDate(m.date) === dateStr
                );
                if (dinnerMeal) {
                    if (dinnerMeal.isOn) dinnerCount += dinnerMeal.count;
                } else if (!isOff) {
                    dinnerCount++;
                }
            });

            return {
                _id: user._id,
                name: user.name,
                lunchCount,
                dinnerCount,
                totalCount: lunchCount + dinnerCount
            };
        }).sort((a, b) => b.totalCount - a.totalCount);

        // ====== 3. Breakfast Daily Cost Pending ======
        const pendingBreakfasts = await Breakfast.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isFinalized: false
        });

        const breakfastPending = {
            count: pendingBreakfasts.length,
            totalCost: pendingBreakfasts.reduce((sum, b) => sum + b.totalCost, 0),
            dates: pendingBreakfasts.map(b => ({
                date: formatDate(b.date),
                totalCost: b.totalCost,
                description: b.description
            }))
        };

        // Also get pending deductions (not yet deducted from user balance)
        const breakfastsWithPendingDeductions = await Breakfast.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            'participants.deducted': false
        });

        let pendingDeductionCount = 0;
        let pendingDeductionAmount = 0;
        breakfastsWithPendingDeductions.forEach(b => {
            b.participants.forEach(p => {
                if (!p.deducted) {
                    pendingDeductionCount++;
                    pendingDeductionAmount += p.cost;
                }
            });
        });

        // ====== 4. Total Deposited Amount (This Month) ======
        const monthlyDeposits = await Transaction.aggregate([
            {
                $match: {
                    type: 'deposit',
                    createdAt: { $gte: monthSettings.startDate, $lte: monthSettings.endDate }
                }
            },
            {
                $group: {
                    _id: '$balanceType',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const depositSummary = {
            breakfast: { amount: 0, count: 0 },
            lunch: { amount: 0, count: 0 },
            dinner: { amount: 0, count: 0 },
            total: { amount: 0, count: 0 }
        };

        monthlyDeposits.forEach(d => {
            depositSummary[d._id] = { amount: d.total, count: d.count };
            depositSummary.total.amount += d.total;
            depositSummary.total.count += d.count;
        });

        // ====== 5. Additional useful stats ======
        // Users with low balance
        const lowBalanceThreshold = 100;
        const usersWithLowBalance = activeUsers.filter(user => {
            const totalBalance = (user.balances?.breakfast?.amount || 0) +
                                (user.balances?.lunch?.amount || 0) +
                                (user.balances?.dinner?.amount || 0);
            return totalBalance < lowBalanceThreshold;
        }).length;

        // Grand totals for the month
        const grandTotalLunch = userMealCounts.reduce((sum, u) => sum + u.lunchCount, 0);
        const grandTotalDinner = userMealCounts.reduce((sum, u) => sum + u.dinnerCount, 0);

        res.json({
            date: formatDate(today),
            period: {
                year,
                month,
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                isFinalized: monthSettings.isFinalized || false
            },
            // Today's meal status
            todayMeals: {
                isHoliday: isTodayHoliday,
                holidayName: isTodayHoliday ? todayHolidays[0].nameBn : null,
                isDefaultOff: isTodayDefaultOff,
                lunch: {
                    usersOn: todayLunchOn,
                    usersOff: totalUsers - todayLunchOn,
                    totalMeals: todayLunchTotal
                },
                dinner: {
                    usersOn: todayDinnerOn,
                    usersOff: totalUsers - todayDinnerOn,
                    totalMeals: todayDinnerTotal
                }
            },
            // Monthly meal counts
            monthlyMeals: {
                grandTotalLunch,
                grandTotalDinner,
                grandTotal: grandTotalLunch + grandTotalDinner,
                lunchRate: monthSettings.lunchRate || 0,
                dinnerRate: monthSettings.dinnerRate || 0,
                estimatedLunchCost: grandTotalLunch * (monthSettings.lunchRate || 0),
                estimatedDinnerCost: grandTotalDinner * (monthSettings.dinnerRate || 0),
                userWise: userMealCounts.slice(0, 10) // Top 10 consumers
            },
            // Breakfast pending
            breakfastPending: {
                notFinalized: breakfastPending,
                pendingDeductions: {
                    count: pendingDeductionCount,
                    amount: pendingDeductionAmount
                }
            },
            // Deposits this month
            deposits: depositSummary,
            // Summary stats
            summary: {
                totalUsers,
                usersWithLowBalance,
                lowBalanceThreshold
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
