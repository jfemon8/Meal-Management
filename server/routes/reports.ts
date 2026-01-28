import express, { Response } from 'express';
const router = express.Router();
import User from '../models/User';
import Meal from '../models/Meal';
import Breakfast from '../models/Breakfast';
import Transaction from '../models/Transaction';
import MonthSettings from '../models/MonthSettings';
import Holiday from '../models/Holiday';
import { protect, isManager, isAdmin } from '../middleware/auth';
import {
    formatDateISO,
    formatDateBn,
    formatDateTime,
    nowBD,
    toBDTime,
    startOfDayBD,
    getDatesBetween,
    formatDate,
    isDefaultMealOff,
    getDefaultMonthRange
} from '../utils/dateUtils';
import { AuthRequest, AuthHandler } from '../types/index';

// @route   GET /api/reports/monthly
// @desc    Get monthly report for a user
// @access  Private
router.get('/monthly', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, userId } = req.query;

        let targetUserId = (req.user as any)._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes((req.user as any).role)) {
            targetUserId = userId;
        }

        // Get user
        const user = await User.findById(targetUserId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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
            const userParticipation = (b as any).participants.find(
                (p: any) => p.user.toString() === targetUserId.toString()
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
        const currentLunchBalance = (user as any).balances.lunch.amount;
        const currentDinnerBalance = (user as any).balances.dinner.amount;
        const currentBreakfastBalance = (user as any).balances.breakfast.amount;

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
                year: parseInt(year as string),
                month: parseInt(month as string),
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
router.get('/all-users', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month } = req.query;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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
            const lunchBalance = (user as any).balances.lunch.amount;
            const dinnerBalance = (user as any).balances.dinner.amount;
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
                    balance: (user as any).balances.lunch,
                    dueAdvance: {
                        amount: Math.abs(lunchDue),
                        type: lunchDue > 0 ? 'due' : lunchDue < 0 ? 'advance' : 'settled'
                    }
                },
                dinner: {
                    totalMeals: totalDinnerMeals,
                    totalCharge: dinnerCharge,
                    balance: (user as any).balances.dinner,
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
                year: parseInt(year as string),
                month: parseInt(month as string),
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
router.get('/wallet-summary', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.query;

        let targetUserId = (req.user as any)._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes((req.user as any).role)) {
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
        const balanceSummary: any = {
            breakfast: {
                current: (user as any).balances.breakfast.amount,
                isFrozen: (user as any).balances.breakfast.isFrozen,
                totalDeposits: 0,
                totalDeductions: 0,
                transactionCount: 0
            },
            lunch: {
                current: (user as any).balances.lunch.amount,
                isFrozen: (user as any).balances.lunch.isFrozen,
                totalDeposits: 0,
                totalDeductions: 0,
                transactionCount: 0
            },
            dinner: {
                current: (user as any).balances.dinner.amount,
                isFrozen: (user as any).balances.dinner.isFrozen,
                totalDeposits: 0,
                totalDeductions: 0,
                transactionCount: 0
            }
        };

        transactionStats.forEach((stat: any) => {
            const bt = stat._id.balanceType;
            if (stat._id.type === 'deposit') {
                balanceSummary[bt].totalDeposits += stat.total;
            } else if (stat._id.type === 'deduction') {
                balanceSummary[bt].totalDeductions += Math.abs(stat.total);
            }
            balanceSummary[bt].transactionCount += stat.count;
        });

        // Overall totals
        const totalBalance = (user as any).balances.breakfast.amount +
                            (user as any).balances.lunch.amount +
                            (user as any).balances.dinner.amount;

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
router.get('/top-consumers', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, mealType = 'all', limit = 10 } = req.query;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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
        const mealQuery: any = {
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
                year: parseInt(year as string),
                month: parseInt(month as string),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate
            },
            mealType,
            topConsumers: consumption.slice(0, parseInt(limit as string)),
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
router.get('/defaulters', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, threshold = 0, balanceType = 'all' } = req.query;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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

        const defaulters: any[] = [];

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

            const lunchDue = lunchCharge - (user as any).balances.lunch.amount;
            const dinnerDue = dinnerCharge - (user as any).balances.dinner.amount;
            const breakfastDue = -(user as any).balances.breakfast.amount; // Negative balance = due
            const totalDue = lunchDue + dinnerDue + breakfastDue;

            // Check if user is a defaulter based on threshold and balance type
            let isDefaulter = false;
            if (balanceType === 'all') {
                isDefaulter = totalDue > parseFloat(threshold as string);
            } else if (balanceType === 'lunch') {
                isDefaulter = lunchDue > parseFloat(threshold as string);
            } else if (balanceType === 'dinner') {
                isDefaulter = dinnerDue > parseFloat(threshold as string);
            } else if (balanceType === 'breakfast') {
                isDefaulter = breakfastDue > parseFloat(threshold as string);
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
                        breakfast: (user as any).balances.breakfast.amount,
                        lunch: (user as any).balances.lunch.amount,
                        dinner: (user as any).balances.dinner.amount
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
                year: parseInt(year as string),
                month: parseInt(month as string),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate
            },
            threshold: parseFloat(threshold as string),
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
router.get('/daily', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { date, mealType = 'lunch' } = req.query;
        const reportDate = new Date(date as string);

        // Validate mealType
        if (!['lunch', 'dinner'].includes(mealType as string)) {
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
            const balance = mealType === 'lunch' ? (user as any).balances.lunch : (user as any).balances.dinner;

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
router.get('/export/csv', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, reportType = 'all-users' } = req.query;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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
                const lunchDue = Math.max(0, lunchCharge - (user as any).balances.lunch.amount);
                const dinnerDue = Math.max(0, dinnerCharge - (user as any).balances.dinner.amount);
                const totalCharge = lunchCharge + dinnerCharge;
                const totalDue = lunchDue + dinnerDue;

                csvContent += `"${user.name}","${user.email}",${lunchCount},${lunchCharge},${(user as any).balances.lunch.amount},${lunchDue},${dinnerCount},${dinnerCharge},${(user as any).balances.dinner.amount},${dinnerDue},${totalCharge},${totalDue}\n`;
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
                const lunchDue = Math.max(0, lunchCharge - (user as any).balances.lunch.amount);
                const dinnerDue = Math.max(0, dinnerCharge - (user as any).balances.dinner.amount);
                const breakfastDue = Math.max(0, -(user as any).balances.breakfast.amount);
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
router.get('/export/json', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, reportType = 'all-users' } = req.query;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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

        const reportData: any = {
            period: {
                year: parseInt(year as string),
                month: parseInt(month as string),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0,
                dinnerRate: monthSettings.dinnerRate || 0
            },
            generatedAt: new Date(),
            generatedBy: (req.user as any).name,
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
            const lunchDue = lunchCharge - (user as any).balances.lunch.amount;
            const dinnerDue = dinnerCharge - (user as any).balances.dinner.amount;
            const breakfastDue = -(user as any).balances.breakfast.amount;
            const totalDue = lunchDue + dinnerDue + breakfastDue;

            const userData = {
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                lunch: {
                    count: lunchCount,
                    charge: lunchCharge,
                    balance: (user as any).balances.lunch.amount,
                    due: Math.max(0, lunchDue)
                },
                dinner: {
                    count: dinnerCount,
                    charge: dinnerCharge,
                    balance: (user as any).balances.dinner.amount,
                    due: Math.max(0, dinnerDue)
                },
                breakfast: {
                    balance: (user as any).balances.breakfast.amount,
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
            reportData.data.sort((a: any, b: any) => b.totalDue - a.totalDue);
        } else {
            reportData.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'bn'));
        }

        // Calculate summary
        reportData.summary = {
            totalUsers: reportData.data.length,
            totalLunchMeals: reportData.data.reduce((sum: number, u: any) => sum + u.lunch.count, 0),
            totalDinnerMeals: reportData.data.reduce((sum: number, u: any) => sum + u.dinner.count, 0),
            totalLunchCharge: reportData.data.reduce((sum: number, u: any) => sum + u.lunch.charge, 0),
            totalDinnerCharge: reportData.data.reduce((sum: number, u: any) => sum + u.dinner.charge, 0),
            totalDue: reportData.data.reduce((sum: number, u: any) => sum + u.totalDue, 0),
            usersWithDue: reportData.data.filter((u: any) => u.status === 'due').length,
            usersWithAdvance: reportData.data.filter((u: any) => u.status === 'advance').length
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
router.get('/user/:userId/monthly', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;

        // Check permission - user can only see their own, Manager+ can see all
        if (userId !== (req.user as any)._id.toString() && !['manager', 'admin', 'superadmin'].includes((req.user as any).role)) {
            return res.status(403).json({ message: 'অননুমোদিত অ্যাক্সেস' });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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
                year: parseInt(year as string),
                month: parseInt(month as string),
                monthName: new Date(parseInt(year as string), parseInt(month as string) - 1).toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' }),
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
                    balance: (user as any).balances.lunch.amount,
                    due: Math.max(0, lunchCharge - (user as any).balances.lunch.amount)
                },
                dinner: {
                    totalMeals: totalDinner,
                    rate: monthSettings.dinnerRate || 0,
                    charge: dinnerCharge,
                    balance: (user as any).balances.dinner.amount,
                    due: Math.max(0, dinnerCharge - (user as any).balances.dinner.amount)
                },
                breakfast: {
                    balance: (user as any).balances.breakfast.amount,
                    due: Math.max(0, -(user as any).balances.breakfast.amount)
                },
                grandTotal: {
                    charge: lunchCharge + dinnerCharge,
                    balance: (user as any).balances.lunch.amount + (user as any).balances.dinner.amount + (user as any).balances.breakfast.amount,
                    due: Math.max(0, (lunchCharge + dinnerCharge) - ((user as any).balances.lunch.amount + (user as any).balances.dinner.amount))
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
router.get('/manager-dashboard', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const today = startOfDayBD();
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({ year, month });
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
            (b as any).participants.forEach((p: any) => {
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

        const depositSummary: any = {
            breakfast: { amount: 0, count: 0 },
            lunch: { amount: 0, count: 0 },
            dinner: { amount: 0, count: 0 },
            total: { amount: 0, count: 0 }
        };

        monthlyDeposits.forEach((d: any) => {
            depositSummary[d._id] = { amount: d.total, count: d.count };
            depositSummary.total.amount += d.total;
            depositSummary.total.count += d.count;
        });

        // ====== 5. Additional useful stats ======
        // Users with low balance
        const lowBalanceThreshold = 100;
        const usersWithLowBalance = activeUsers.filter(user => {
            const totalBalance = ((user as any).balances?.breakfast?.amount || 0) +
                                ((user as any).balances?.lunch?.amount || 0) +
                                ((user as any).balances?.dinner?.amount || 0);
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

// @route   GET /api/reports/export/excel
// @desc    Export report as Excel (Manager+ only)
// @access  Private (Manager+)
router.get('/export/excel', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, reportType = 'all-users' } = req.query;

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        if (!monthSettings) {
            const { startDate, endDate } = getDefaultMonthRange(parseInt(year as string), parseInt(month as string));
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

        // Get breakfast data
        const allBreakfasts = await Breakfast.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isReversed: { $ne: true }
        });

        // Build Excel data
        const excelData: any[] = [];

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

            // Calculate breakfast cost
            let breakfastCost = 0;
            allBreakfasts.forEach(b => {
                const participation = (b as any).participants.find((p: any) => p.user.toString() === user._id.toString());
                if (participation) breakfastCost += participation.cost;
            });

            const lunchCharge = lunchCount * (monthSettings.lunchRate || 0);
            const dinnerCharge = dinnerCount * (monthSettings.dinnerRate || 0);
            const lunchDue = Math.max(0, lunchCharge - (user as any).balances.lunch.amount);
            const dinnerDue = Math.max(0, dinnerCharge - (user as any).balances.dinner.amount);
            const breakfastDue = Math.max(0, breakfastCost - (user as any).balances.breakfast.amount);
            const totalCharge = lunchCharge + dinnerCharge + breakfastCost;
            const totalBalance = (user as any).balances.lunch.amount + (user as any).balances.dinner.amount + (user as any).balances.breakfast.amount;
            const totalDue = lunchDue + dinnerDue + breakfastDue;

            const userData: any = {
                'নাম': user.name,
                'ইমেইল': user.email,
                'ফোন': user.phone || '',
                'দুপুর মিল': lunchCount,
                'দুপুর চার্জ': lunchCharge,
                'দুপুর ব্যালেন্স': (user as any).balances.lunch.amount,
                'দুপুর বকেয়া': lunchDue,
                'রাত মিল': dinnerCount,
                'রাত চার্জ': dinnerCharge,
                'রাত ব্যালেন্স': (user as any).balances.dinner.amount,
                'রাত বকেয়া': dinnerDue,
                'নাস্তা খরচ': breakfastCost,
                'নাস্তা ব্যালেন্স': (user as any).balances.breakfast.amount,
                'নাস্তা বকেয়া': breakfastDue,
                'মোট চার্জ': totalCharge,
                'মোট ব্যালেন্স': totalBalance,
                'মোট বকেয়া': totalDue
            };

            if (reportType === 'defaulters') {
                if (totalDue > 0) {
                    excelData.push(userData);
                }
            } else {
                excelData.push(userData);
            }
        });

        // Sort by name for all-users, by due for defaulters
        if (reportType === 'defaulters') {
            excelData.sort((a, b) => b['মোট বকেয়া'] - a['মোট বকেয়া']);
        } else {
            excelData.sort((a, b) => a['নাম'].localeCompare(b['নাম'], 'bn'));
        }

        // Generate simple HTML table format that Excel can open
        let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
table { border-collapse: collapse; }
th, td { border: 1px solid black; padding: 5px; text-align: left; }
th { background-color: #f0f0f0; font-weight: bold; }
.number { text-align: right; }
</style>
</head>
<body>
<h2>মিল ম্যানেজমেন্ট সিস্টেম</h2>
<h3>${reportType === 'defaulters' ? 'বকেয়া তালিকা' : 'সব ইউজার রিপোর্ট'} - ${year}/${month}</h3>
<p>তৈরি: ${new Date().toLocaleString('bn-BD')}</p>
<table>
<thead><tr>`;

        // Headers
        const headers = Object.keys(excelData[0] || {});
        headers.forEach(h => {
            html += `<th>${h}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Data rows
        excelData.forEach(row => {
            html += '<tr>';
            headers.forEach(h => {
                const value = row[h];
                const isNumber = typeof value === 'number';
                html += `<td class="${isNumber ? 'number' : ''}">${value}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table></body></html>';

        // Set headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=report-${year}-${month}-${reportType}.xls`);
        res.send(html);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/reports/admin-dashboard
// @desc    Get admin dashboard statistics (Admin+ only)
// @access  Private (Admin+)
router.get('/admin-dashboard', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const today = startOfDayBD();

        // Get user role counts
        const roleCounts = await User.aggregate([
            { $match: { isActive: true, isDeleted: { $ne: true } } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const roleStats: any = {
            users: 0,
            managers: 0,
            admins: 0,
            superadmins: 0,
            total: 0
        };

        roleCounts.forEach((r: any) => {
            if (r._id === 'user') roleStats.users = r.count;
            else if (r._id === 'manager') roleStats.managers = r.count;
            else if (r._id === 'admin') roleStats.admins = r.count;
            else if (r._id === 'superadmin') roleStats.superadmins = r.count;
            roleStats.total += r.count;
        });

        // Get inactive users count
        const inactiveUsers = await User.countDocuments({ isActive: false });

        // Get users registered this month
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const newUsersThisMonth = await User.countDocuments({
            createdAt: { $gte: thisMonthStart }
        });

        // Get users with frozen balances
        const frozenBalanceUsers = await User.countDocuments({
            $or: [
                { 'balances.breakfast.isFrozen': true },
                { 'balances.lunch.isFrozen': true },
                { 'balances.dinner.isFrozen': true }
            ]
        });

        // Get total balance in system
        const balanceAggregation = await User.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalBreakfast: { $sum: '$balances.breakfast.amount' },
                    totalLunch: { $sum: '$balances.lunch.amount' },
                    totalDinner: { $sum: '$balances.dinner.amount' }
                }
            }
        ]);

        const totalBalances = balanceAggregation[0] || {
            totalBreakfast: 0,
            totalLunch: 0,
            totalDinner: 0
        };

        // Get transactions summary for this month
        const monthlyTransactionStats = await Transaction.aggregate([
            {
                $match: {
                    createdAt: { $gte: thisMonthStart }
                }
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: { $abs: '$amount' } },
                    count: { $sum: 1 }
                }
            }
        ]);

        const transactionSummary: any = {
            deposits: { amount: 0, count: 0 },
            deductions: { amount: 0, count: 0 },
            adjustments: { amount: 0, count: 0 },
            refunds: { amount: 0, count: 0 }
        };

        monthlyTransactionStats.forEach((t: any) => {
            if (t._id === 'deposit') transactionSummary.deposits = { amount: t.total, count: t.count };
            else if (t._id === 'deduction') transactionSummary.deductions = { amount: t.total, count: t.count };
            else if (t._id === 'adjustment') transactionSummary.adjustments = { amount: t.total, count: t.count };
            else if (t._id === 'refund') transactionSummary.refunds = { amount: t.total, count: t.count };
        });

        // Generate system alerts based on conditions
        const systemAlerts: any[] = [];

        // Alert: Users with very low balance
        const veryLowBalanceUsers = await User.countDocuments({
            isActive: true,
            $expr: {
                $lt: [
                    { $add: ['$balances.breakfast.amount', '$balances.lunch.amount', '$balances.dinner.amount'] },
                    0
                ]
            }
        });
        if (veryLowBalanceUsers > 0) {
            systemAlerts.push({
                type: 'warning',
                title: 'নেগেটিভ ব্যালেন্স',
                message: `${veryLowBalanceUsers} জন ইউজারের ব্যালেন্স নেগেটিভ`,
                actionUrl: '/manager/balance',
                priority: 'high'
            });
        }

        // Alert: Pending breakfast finalization
        const pendingBreakfasts = await Breakfast.countDocuments({
            isFinalized: false,
            date: { $lt: today }
        });
        if (pendingBreakfasts > 0) {
            systemAlerts.push({
                type: 'info',
                title: 'নাস্তা পেন্ডিং',
                message: `${pendingBreakfasts} দিনের নাস্তা ফাইনালাইজ বাকি`,
                actionUrl: '/manager/breakfast',
                priority: 'normal'
            });
        }

        // Alert: Month not finalized (if past month end)
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const lastMonthSettings = await MonthSettings.findOne({
            year: lastMonthYear,
            month: lastMonth
        });

        if (lastMonthSettings && !lastMonthSettings.isFinalized) {
            systemAlerts.push({
                type: 'warning',
                title: 'মাস ফাইনালাইজ বাকি',
                message: `${lastMonthYear}/${lastMonth} মাস এখনো ফাইনালাইজ করা হয়নি`,
                actionUrl: '/manager/month-settings',
                priority: 'high'
            });
        }

        // Alert: No current month settings
        const currentMonthSettings = await MonthSettings.findOne({
            year: currentYear,
            month: currentMonth
        });

        if (!currentMonthSettings) {
            systemAlerts.push({
                type: 'info',
                title: 'মাস সেটিংস বাকি',
                message: `${currentYear}/${currentMonth} মাসের সেটিংস তৈরি করা হয়নি`,
                actionUrl: '/manager/month-settings',
                priority: 'normal'
            });
        }

        // Alert: Inactive users
        if (inactiveUsers > 0) {
            systemAlerts.push({
                type: 'info',
                title: 'নিষ্ক্রিয় ইউজার',
                message: `${inactiveUsers} জন ইউজার নিষ্ক্রিয় আছে`,
                actionUrl: '/admin/users',
                priority: 'low'
            });
        }

        res.json({
            roleStats,
            userStats: {
                inactive: inactiveUsers,
                newThisMonth: newUsersThisMonth,
                frozenBalances: frozenBalanceUsers
            },
            balanceStats: {
                breakfast: totalBalances.totalBreakfast,
                lunch: totalBalances.totalLunch,
                dinner: totalBalances.totalDinner,
                total: totalBalances.totalBreakfast + totalBalances.totalLunch + totalBalances.totalDinner
            },
            transactionSummary,
            systemAlerts,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

export default router;
