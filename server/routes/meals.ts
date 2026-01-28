import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Meal from '../models/Meal';
import Holiday from '../models/Holiday';
import MonthSettings from '../models/MonthSettings';
import GlobalSettings from '../models/GlobalSettings';
import { protect, isManager } from '../middleware/auth';
import { requirePermission, requireOwnershipOrPermission } from '../middleware/permissions';
import { PERMISSIONS } from '../config/permissions';
import {
    formatDateISO,
    formatDateBn,
    formatDateTime,
    nowBD,
    toBDTime,
    startOfDayBD,
    isPast,
    isToday,
    isFuture,
    formatDate,
    getDatesBetween,
    isDefaultMealOff
} from '../utils/dateUtils';
import MealAuditLog from '../models/MealAuditLog';
import mealRulesService from '../services/mealRulesService';
import { AuthRequest } from '../types';

const router = express.Router();

// @route   GET /api/meals/status
// @desc    Get meal status for a date range (Dynamic with GlobalSettings)
// @access  Private (VIEW_OWN_MEALS or VIEW_ALL_MEALS)
router.get('/status', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate, userId, mealType = 'lunch' } = req.query;

        // Validate mealType
        if (!['lunch', 'dinner'].includes(mealType as string)) {
            return res.status(400).json({ message: 'মিল টাইপ অবৈধ। lunch বা dinner হতে হবে।' });
        }

        // Users can only see their own meals, unless they have VIEW_ALL_MEALS permission
        let targetUserId = req.user!._id;
        if (userId) {
            const User = require('../models/User');
            const currentUser = await User.findById(req.user!._id);

            if (!currentUser.hasPermission(PERMISSIONS.VIEW_ALL_MEALS)) {
                return res.status(403).json({
                    message: 'আপনি শুধুমাত্র নিজের মিল দেখতে পারবেন।'
                });
            }
            targetUserId = userId;
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        // Get global settings for dynamic rules
        const settings = await GlobalSettings.getSettings();

        // Get holidays filtered by policy
        const holidays = await mealRulesService.getApplicableHolidays(start, end, settings);

        // Get manually set meals
        const meals = await Meal.find({
            user: targetUserId,
            date: { $gte: start, $lte: end },
            mealType
        });

        // Build response with dynamic status
        const dates = getDatesBetween(start, end);
        const mealStatusPromises = dates.map(async (date: any) => {
            const dateStr = formatDate(date);
            const manualMeal = meals.find((m: any) => formatDate(m.date) === dateStr);

            // Get effective status using dynamic rules
            const effectiveStatus = await mealRulesService.getEffectiveMealStatus({
                date,
                mealType,
                manualMeal,
                holidays,
                settings
            });

            // Check edit permission
            const permission = await mealRulesService.getMealTogglePermission({
                user: req.user,
                date,
                mealType,
                settings
            });

            // Get default off status for display
            const defaultOffCheck = await mealRulesService.isDefaultMealOff(date, holidays, settings);

            return {
                date: dateStr,
                mealType,
                isDefaultOff: defaultOffCheck.isOff,
                defaultOffReason: defaultOffCheck.reason,
                isOn: effectiveStatus.isOn,
                count: effectiveStatus.count,
                isManuallySet: !!manualMeal,
                source: effectiveStatus.source,
                canEdit: permission.canToggle,
                editRestriction: permission.reason
            };
        });

        const mealStatus = await Promise.all(mealStatusPromises);

        res.json({
            mealType,
            meals: mealStatus,
            settings: {
                weekendPolicy: settings.weekendPolicy,
                holidayPolicy: settings.holidayPolicy,
                cutoffTimes: settings.cutoffTimes,
                defaultMealStatus: settings.defaultMealStatus
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/meals/toggle
// @desc    Toggle meal on/off for a specific date (Dynamic with GlobalSettings)
// @access  Private
router.put('/toggle', protect, [
    body('date').notEmpty().withMessage('তারিখ আবশ্যক'),
    body('isOn').isBoolean().withMessage('isOn বুলিয়ান হতে হবে'),
    body('mealType').optional().isIn(['lunch', 'dinner']).withMessage('মিল টাইপ অবৈধ')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, isOn, userId, count, mealType = 'lunch' } = req.body;
        const mealDate = new Date(date);

        // Check permissions
        let targetUserId = req.user!._id;
        const isManagerRole = ['manager', 'admin', 'superadmin'].includes(req.user!.role);

        if (userId && isManagerRole) {
            targetUserId = userId;
        } else if (userId && userId !== req.user!._id.toString()) {
            return res.status(403).json({ message: 'অন্যের মিল পরিবর্তন করার অনুমতি নেই' });
        }

        // Use centralized validation with all dynamic rules
        const validation = await mealRulesService.validateMealToggle({
            user: req.user,
            date: mealDate,
            mealType,
            targetUserId
        });

        if (!validation.valid) {
            return res.status(400).json({
                message: validation.error,
                source: validation.details?.source
            });
        }

        // Get previous meal state for audit
        const previousMeal = await Meal.findOne({
            user: targetUserId,
            date: mealDate,
            mealType
        });

        // Update or create meal record
        const meal = await Meal.findOneAndUpdate(
            { user: targetUserId, date: mealDate, mealType },
            {
                isOn,
                count: isOn ? (count || 1) : 0,
                modifiedBy: req.user!._id,
                isManuallySet: true
            },
            { upsert: true, new: true }
        );

        const mealTypeBn = mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';

        // Create audit log
        await MealAuditLog.create({
            user: targetUserId,
            date: mealDate,
            mealType,
            action: isOn ? 'toggle_on' : 'toggle_off',
            previousState: previousMeal
                ? { isOn: previousMeal.isOn, count: previousMeal.count }
                : { isOn: null, count: null },
            newState: { isOn, count: isOn ? (count || 1) : 0 },
            changedBy: req.user!._id,
            changedByRole: req.user!.role,
            ipAddress: req.ip || (req as any).connection?.remoteAddress || ''
        });

        res.json({
            message: isOn ? `${mealTypeBn} অন করা হয়েছে` : `${mealTypeBn} অফ করা হয়েছে`,
            meal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/meals/bulk-toggle
// @desc    Bulk toggle meals on/off for a date range (Dynamic with GlobalSettings)
// @access  Private
router.put('/bulk-toggle', protect, [
    body('startDate').notEmpty().withMessage('শুরুর তারিখ আবশ্যক'),
    body('endDate').notEmpty().withMessage('শেষ তারিখ আবশ্যক'),
    body('isOn').isBoolean().withMessage('isOn বুলিয়ান হতে হবে'),
    body('mealType').optional().isIn(['lunch', 'dinner']).withMessage('মিল টাইপ অবৈধ')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { startDate, endDate, isOn, mealType = 'lunch', userId } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate date range
        if (start > end) {
            return res.status(400).json({ message: 'শুরুর তারিখ শেষ তারিখের আগে হতে হবে' });
        }

        // Maximum 31 days range
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 31) {
            return res.status(400).json({ message: 'সর্বোচ্চ ৩১ দিনের রেঞ্জ সিলেক্ট করতে পারবেন' });
        }

        const isManagerRole = ['manager', 'admin', 'superadmin'].includes(req.user!.role);

        // Determine target user
        let targetUserId = req.user!._id;
        if (userId && isManagerRole) {
            targetUserId = userId;
        } else if (userId && userId !== req.user!._id.toString()) {
            return res.status(403).json({ message: 'অন্যের মিল পরিবর্তন করার অনুমতি নেই' });
        }

        // Get dates in range
        const dates = getDatesBetween(start, end);

        // Filter dates based on dynamic permission check
        const allowedDates: any[] = [];
        const skippedDates: any[] = [];

        for (const date of dates) {
            const validation = await mealRulesService.validateMealToggle({
                user: req.user,
                date,
                mealType,
                targetUserId
            });

            if (validation.valid) {
                allowedDates.push(date);
            } else {
                skippedDates.push({ date: formatDate(date), reason: validation.error });
            }
        }

        if (allowedDates.length === 0) {
            return res.status(400).json({
                message: 'কোনো পরিবর্তনযোগ্য তারিখ নেই',
                skippedDates
            });
        }

        // Bulk update meals
        const bulkOps = allowedDates.map((date: any) => ({
            updateOne: {
                filter: { user: targetUserId, date, mealType },
                update: {
                    isOn,
                    count: isOn ? 1 : 0,
                    modifiedBy: req.user!._id,
                    isManuallySet: true
                },
                upsert: true
            }
        }));

        await Meal.bulkWrite(bulkOps);

        // Create audit logs for bulk operation
        const auditLogs = allowedDates.map((date: any) => ({
            user: targetUserId,
            date,
            mealType,
            action: isOn ? 'bulk_on' : 'bulk_off',
            previousState: { isOn: !isOn, count: isOn ? 0 : 1 },
            newState: { isOn, count: isOn ? 1 : 0 },
            changedBy: req.user!._id,
            changedByRole: req.user!.role,
            notes: `Bulk ${isOn ? 'ON' : 'OFF'}: ${formatDate(start)} - ${formatDate(end)}${userId ? ' (Manager)' : ''}`,
            ipAddress: req.ip || (req as any).connection?.remoteAddress || ''
        }));

        await MealAuditLog.insertMany(auditLogs);

        const mealTypeBn = mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
        res.json({
            message: `${allowedDates.length}টি দিনের ${mealTypeBn} ${isOn ? 'অন' : 'অফ'} করা হয়েছে`,
            updatedCount: allowedDates.length,
            skippedCount: skippedDates.length,
            skippedDates: skippedDates.length > 0 ? skippedDates : undefined,
            startDate: formatDate(start),
            endDate: formatDate(end)
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
    body('count').isInt({ min: 0 }).withMessage('সংখ্যা ০ বা তার বেশি হতে হবে'),
    body('mealType').optional().isIn(['lunch', 'dinner']).withMessage('মিল টাইপ অবৈধ')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, userId, count, notes, mealType = 'lunch' } = req.body;
        const mealDate = new Date(date);

        const meal = await Meal.findOneAndUpdate(
            { user: userId, date: mealDate, mealType },
            {
                isOn: count > 0,
                count,
                modifiedBy: req.user!._id,
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
// @desc    Get meal summary for a user for a month (Dynamic with GlobalSettings)
// @access  Private
router.get('/summary', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, userId, mealType = 'lunch' } = req.query;

        // Validate mealType
        if (!['lunch', 'dinner'].includes(mealType as string)) {
            return res.status(400).json({ message: 'মিল টাইপ অবৈধ। lunch বা dinner হতে হবে।' });
        }

        let targetUserId: any = req.user!._id;
        if (userId && ['manager', 'admin', 'superadmin'].includes(req.user!.role)) {
            targetUserId = userId;
        }

        // Get global settings
        const settings = await GlobalSettings.getSettings();

        // Get month settings
        let monthSettings: any = await MonthSettings.findOne({
            year: parseInt(year as string),
            month: parseInt(month as string)
        });

        // Use default if no settings exist
        if (!monthSettings) {
            const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
            const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
            monthSettings = {
                startDate,
                endDate,
                lunchRate: 0,
                dinnerRate: 0
            };
        }

        // Get holidays filtered by policy
        const holidays = await mealRulesService.getApplicableHolidays(
            monthSettings.startDate,
            monthSettings.endDate,
            settings
        );

        // Get meals
        const meals = await Meal.find({
            user: targetUserId,
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType
        });

        // Calculate totals using dynamic rules
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        let totalMeals = 0;
        let totalDaysOn = 0;

        for (const date of dates) {
            const dateStr = formatDate(date);
            const manualMeal = meals.find((m: any) => formatDate(m.date) === dateStr);

            // Use dynamic effective status
            const effectiveStatus = await mealRulesService.getEffectiveMealStatus({
                date,
                mealType,
                manualMeal,
                holidays,
                settings
            });

            if (effectiveStatus.isOn) {
                totalMeals += effectiveStatus.count;
                totalDaysOn++;
            }
        }

        // Use appropriate rate based on meal type
        const rate = mealType === 'lunch'
            ? (monthSettings.lunchRate || 0)
            : (monthSettings.dinnerRate || 0);
        const totalCharge = totalMeals * rate;

        res.json({
            year: parseInt(year as string),
            month: parseInt(month as string),
            mealType,
            startDate: monthSettings.startDate,
            endDate: monthSettings.endDate,
            rate,
            totalDays: dates.length,
            totalDaysOn,
            totalMeals,
            totalCharge,
            holidays: holidays.map((h: any) => ({ date: h.date, name: h.nameBn }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/meals/daily
// @desc    Get all users' meal status for a specific date (Manager+ only)
// @access  Private (Manager+)
router.get('/daily', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { date, mealType = 'lunch' } = req.query;
        const mealDate = new Date(date as string);

        // Validate mealType
        if (!['lunch', 'dinner'].includes(mealType as string)) {
            return res.status(400).json({ message: 'মিল টাইপ অবৈধ। lunch বা dinner হতে হবে।' });
        }

        // Get all active users
        const User = require('../models/User');
        const users = await User.find({ isActive: true }).select('name email');

        // Get holidays
        const holidays = await Holiday.find({
            date: mealDate,
            isActive: true
        });
        const holidayDates = holidays.map((h: any) => h.date);
        const isDefaultOff = isDefaultMealOff(mealDate, holidayDates);

        // Get meals for all users
        const meals = await Meal.find({
            date: mealDate,
            mealType
        }).populate('user', 'name email');

        // Build response
        const dailyMeals = users.map((user: any) => {
            const meal = meals.find((m: any) => m.user._id.toString() === user._id.toString());

            return {
                user: { _id: user._id, name: user.name, email: user.email },
                isOn: meal ? meal.isOn : !isDefaultOff,
                count: meal ? meal.count : (!isDefaultOff ? 1 : 0),
                isManuallySet: !!meal
            };
        });

        // Calculate totals
        const totalMealsOn = dailyMeals.filter((m: any) => m.isOn).length;
        const totalMealCount = dailyMeals.reduce((sum: number, m: any) => sum + m.count, 0);

        res.json({
            date: formatDate(mealDate),
            mealType,
            isDefaultOff,
            isHoliday: holidays.length > 0,
            holidayName: holidays.length > 0 ? (holidays[0] as any).nameBn : null,
            totalMealsOn,
            totalMealCount,
            meals: dailyMeals
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/meals/audit-log
// @desc    Get meal change audit log
// @access  Private (Users see own, Manager+ sees all)
router.get('/audit-log', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { userId, startDate, endDate, mealType, limit = 50, page = 1 } = req.query;
        const isManagerRole = ['manager', 'admin', 'superadmin'].includes(req.user!.role);

        const query: any = {};

        // Users can only see their own audit log
        if (userId && isManagerRole) {
            query.user = userId;
        } else if (!isManagerRole) {
            query.user = req.user!._id;
        }

        // Date range filter
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        // Meal type filter
        if (mealType && ['lunch', 'dinner'].includes(mealType as string)) {
            query.mealType = mealType;
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [logs, total] = await Promise.all([
            MealAuditLog.find(query)
                .populate('user', 'name email')
                .populate('changedBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit as string)),
            MealAuditLog.countDocuments(query)
        ]);

        res.json({
            logs,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                totalPages: Math.ceil(total / parseInt(limit as string))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/meals/audit-log/:userId
// @desc    Get audit log for a specific user (Manager+ only)
// @access  Private (Manager+)
router.get('/audit-log/:userId', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate, mealType, limit = 50 } = req.query;

        const query: any = { user: req.params.userId };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        if (mealType && ['lunch', 'dinner'].includes(mealType as string)) {
            query.mealType = mealType;
        }

        const logs = await MealAuditLog.find(query)
            .populate('user', 'name email')
            .populate('changedBy', 'name email role')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string));

        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/meals/recalculate
// @desc    Recalculate meals for a month based on current rules (Manager+ only)
// @access  Private (Manager+)
router.post('/recalculate', protect, isManager, [
    body('year').isInt({ min: 2020, max: 2030 }).withMessage('বছর ২০২০-২০৩০ এর মধ্যে হতে হবে'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('মাস ১-১২ এর মধ্যে হতে হবে'),
    body('mealType').optional().isIn(['lunch', 'dinner', 'both']).withMessage('মিল টাইপ অবৈধ')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { year, month, mealType = 'both', userId } = req.body;

        // Get month settings
        let monthSettings = await MonthSettings.findOne({ year, month });

        if (!monthSettings) {
            return res.status(404).json({ message: 'এই মাসের সেটিংস পাওয়া যায়নি' });
        }

        // Check if month is finalized
        if (monthSettings.isFinalized) {
            return res.status(400).json({ message: 'ফাইনালাইজড মাসের মিল রিক্যালকুলেট করা যাবে না' });
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            isActive: true
        });
        const holidayDates = holidays.map((h: any) => h.date);

        // Get users to recalculate (all or specific)
        const User = require('../models/User');
        let users;
        if (userId) {
            users = await User.find({ _id: userId, isActive: true });
        } else {
            users = await User.find({ isActive: true });
        }

        // Get dates in range
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);
        const mealTypes = mealType === 'both' ? ['lunch', 'dinner'] : [mealType];

        let updatedCount = 0;
        let createdCount = 0;
        const recalculationResults: any[] = [];

        for (const user of users) {
            for (const type of mealTypes) {
                for (const date of dates) {
                    const isOff = isDefaultMealOff(date, holidayDates);

                    // Find existing meal record
                    const existingMeal = await Meal.findOne({
                        user: user._id,
                        date,
                        mealType: type
                    });

                    // If no manual setting exists, create/update based on default rules
                    if (!existingMeal || !existingMeal.isManuallySet) {
                        const expectedIsOn = !isOff;
                        const expectedCount = expectedIsOn ? 1 : 0;

                        if (existingMeal) {
                            // Only update if different from expected
                            if (existingMeal.isOn !== expectedIsOn || existingMeal.count !== expectedCount) {
                                existingMeal.isOn = expectedIsOn;
                                existingMeal.count = expectedCount;
                                existingMeal.modifiedBy = req.user!._id;
                                await existingMeal.save();
                                updatedCount++;
                            }
                        } else {
                            // Create new meal record with default status
                            await Meal.create({
                                user: user._id,
                                date,
                                mealType: type,
                                isOn: expectedIsOn,
                                count: expectedCount,
                                modifiedBy: req.user!._id,
                                isManuallySet: false
                            });
                            createdCount++;
                        }
                    }
                }
            }

            recalculationResults.push({
                userId: user._id,
                userName: user.name
            });
        }

        // Create audit log
        await MealAuditLog.create({
            user: req.user!._id,
            date: new Date(),
            mealType: mealType === 'both' ? 'lunch' : mealType,
            action: 'manager_override',
            previousState: { isOn: null, count: null },
            newState: { isOn: null, count: null },
            changedBy: req.user!._id,
            changedByRole: req.user!.role,
            notes: `Recalculate meals for ${year}-${month}, Type: ${mealType}, Users: ${users.length}`,
            ipAddress: req.ip || (req as any).connection?.remoteAddress || ''
        });

        res.json({
            message: 'মিল সফলভাবে রিক্যালকুলেট করা হয়েছে',
            year,
            month,
            mealType,
            stats: {
                usersProcessed: users.length,
                mealsCreated: createdCount,
                mealsUpdated: updatedCount,
                daysProcessed: dates.length
            },
            note: 'শুধুমাত্র ম্যানুয়ালি সেট করা নয় এমন মিল রিক্যালকুলেট হয়েছে'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/meals/reset-to-default
// @desc    Reset all meals to default for a date range (Admin+ only)
// @access  Private (Admin+)
router.post('/reset-to-default', protect, async (req: AuthRequest, res: Response) => {
    try {
        // Only admin+ can reset
        if (!['admin', 'superadmin'].includes(req.user!.role)) {
            return res.status(403).json({ message: 'শুধুমাত্র এডমিন রিসেট করতে পারবে' });
        }

        const { startDate, endDate, mealType = 'both', userId } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'শুরু ও শেষ তারিখ আবশ্যক' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Max 31 days
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > 31) {
            return res.status(400).json({ message: 'সর্বোচ্চ ৩১ দিনের রেঞ্জ রিসেট করতে পারবেন' });
        }

        const query: any = {
            date: { $gte: start, $lte: end }
        };

        if (userId) {
            query.user = userId;
        }

        if (mealType !== 'both') {
            query.mealType = mealType;
        }

        // Delete manually set meals (reset to default)
        const result = await Meal.deleteMany({
            ...query,
            isManuallySet: true
        });

        // Create audit log
        await MealAuditLog.create({
            user: req.user!._id,
            date: new Date(),
            mealType: mealType === 'both' ? 'lunch' : mealType,
            action: 'manager_override',
            previousState: { isOn: null, count: null },
            newState: { isOn: null, count: null },
            changedBy: req.user!._id,
            changedByRole: req.user!.role,
            notes: `Reset to default: ${formatDate(start)} - ${formatDate(end)}, Type: ${mealType}, Deleted: ${result.deletedCount}`,
            ipAddress: req.ip || (req as any).connection?.remoteAddress || ''
        });

        res.json({
            message: 'মিল ডিফল্টে রিসেট করা হয়েছে',
            deletedCount: result.deletedCount,
            startDate: formatDate(start),
            endDate: formatDate(end)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

export default router;
