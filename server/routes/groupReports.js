const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Group = require('../models/Group');
const Meal = require('../models/Meal');
const Transaction = require('../models/Transaction');
const MonthSettings = require('../models/MonthSettings');
const Holiday = require('../models/Holiday');
const { protect, isManager } = require('../middleware/auth');
const { canAccessGroup, getGroupFilteredUsers, checkGroupPermission } = require('../middleware/groupAccess');
const { generateLunchStatementPDF, generateGroupLunchStatementPDF } = require('../utils/pdfGenerator');
const {
    getDatesBetween,
    formatDate,
    isDefaultMealOff,
    getDefaultMonthRange
} = require('../utils/dateUtils');

// @route   GET /api/group-reports/my-group
// @desc    Get manager's group info with member count
// @access  Private (Manager+)
router.get('/my-group', protect, isManager, canAccessGroup, async (req, res) => {
    try {
        const group = req.group;
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

        const memberCount = await User.countDocuments({
            group: group._id,
            isActive: true,
            isDeleted: { $ne: true }
        });

        res.json({
            _id: group._id,
            name: group.name,
            description: group.description,
            code: group.code,
            memberCount,
            settings: group.settings,
            isActive: group.isActive
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/group-reports/members
// @desc    Get all members of manager's group
// @access  Private (Manager+)
router.get('/members', protect, isManager, canAccessGroup, checkGroupPermission('canManagerViewReports'), async (req, res) => {
    try {
        const groupId = req.group?._id || req.query.groupId;

        let query = { isActive: true, isDeleted: { $ne: true } };

        // For managers, filter by their group only
        if (req.user.role === 'manager') {
            query.group = groupId;
        } else if (groupId) {
            // Admin/SuperAdmin can filter by groupId if provided
            query.group = groupId;
        }

        const members = await User.find(query)
            .select('name email phone balances group')
            .populate('group', 'name')
            .sort({ name: 1 });

        res.json(members);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/group-reports/lunch-summary
// @desc    Get lunch summary for group members
// @access  Private (Manager+)
router.get('/lunch-summary', protect, isManager, canAccessGroup, checkGroupPermission('canManagerViewReports'), async (req, res) => {
    try {
        const { year, month } = req.query;
        const groupId = req.group?._id || req.query.groupId;

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
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        // Build user query based on role
        let userQuery = { isActive: true, isDeleted: { $ne: true } };
        if (req.user.role === 'manager') {
            userQuery.group = groupId;
        } else if (groupId) {
            userQuery.group = groupId;
        }

        const users = await User.find(userQuery).select('name email phone balances group');

        // Get all lunch meals for the period
        const userIds = users.map(u => u._id);
        const allLunchMeals = await Meal.find({
            user: { $in: userIds },
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        // Calculate for each user
        const memberReports = users.map(user => {
            const userMeals = allLunchMeals.filter(m => m.user.toString() === user._id.toString());
            let totalMeals = 0;
            let daysOn = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);
                const meal = userMeals.find(m => formatDate(m.date) === dateStr);

                let isOn, count;
                if (meal) {
                    isOn = meal.isOn;
                    count = meal.count;
                } else {
                    isOn = !isDefaultOff;
                    count = isOn ? 1 : 0;
                }

                if (isOn) {
                    totalMeals += count;
                    daysOn++;
                }
            });

            const totalCharge = totalMeals * (monthSettings.lunchRate || 0);
            const balance = user.balances?.lunch?.amount || 0;
            const due = totalCharge - balance;

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                daysOn,
                totalMeals,
                totalCharge,
                balance,
                dueAdvance: {
                    amount: Math.abs(due),
                    type: due > 0 ? 'due' : due < 0 ? 'advance' : 'settled'
                }
            };
        });

        // Sort by name
        memberReports.sort((a, b) => a.name.localeCompare(b.name, 'bn'));

        // Calculate summary
        const summary = {
            totalMembers: memberReports.length,
            totalMeals: memberReports.reduce((sum, m) => sum + m.totalMeals, 0),
            totalCharge: memberReports.reduce((sum, m) => sum + m.totalCharge, 0),
            totalDue: memberReports.filter(m => m.dueAdvance.type === 'due').reduce((sum, m) => sum + m.dueAdvance.amount, 0),
            totalAdvance: memberReports.filter(m => m.dueAdvance.type === 'advance').reduce((sum, m) => sum + m.dueAdvance.amount, 0),
            membersWithDue: memberReports.filter(m => m.dueAdvance.type === 'due').length,
            membersWithAdvance: memberReports.filter(m => m.dueAdvance.type === 'advance').length
        };

        res.json({
            group: req.group ? { _id: req.group._id, name: req.group.name } : null,
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0,
                totalDays: dates.length
            },
            members: memberReports,
            summary
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/group-reports/user/:userId/lunch-statement
// @desc    Get detailed lunch statement for a specific user (for PDF)
// @access  Private (Manager+)
router.get('/user/:userId/lunch-statement', protect, isManager, canAccessGroup, checkGroupPermission('canManagerViewReports'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month, startDate: customStart, endDate: customEnd } = req.query;

        // Check if user belongs to manager's group
        const user = await User.findById(userId).select('-password').populate('group', 'name');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // For managers, verify user is in their group
        if (req.user.role === 'manager' && req.group) {
            if (!user.group || user.group._id.toString() !== req.group._id.toString()) {
                return res.status(403).json({ message: 'এই ইউজার আপনার গ্রুপের সদস্য নয়' });
            }
        }

        // Determine date range
        let startDate, endDate, lunchRate = 0;

        if (customStart && customEnd) {
            // Custom date range
            startDate = new Date(customStart);
            endDate = new Date(customEnd);

            // Get rate from month settings if available
            const monthSettings = await MonthSettings.findOne({
                year: startDate.getFullYear(),
                month: startDate.getMonth() + 1
            });
            lunchRate = monthSettings?.lunchRate || 0;
        } else if (year && month) {
            // Month-based range
            const monthSettings = await MonthSettings.findOne({
                year: parseInt(year),
                month: parseInt(month)
            });

            if (monthSettings) {
                startDate = monthSettings.startDate;
                endDate = monthSettings.endDate;
                lunchRate = monthSettings.lunchRate || 0;
            } else {
                const range = getDefaultMonthRange(parseInt(year), parseInt(month));
                startDate = range.startDate;
                endDate = range.endDate;
            }
        } else {
            return res.status(400).json({ message: 'সময়কাল প্রয়োজন (year/month অথবা startDate/endDate)' });
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: startDate, $lte: endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);
        const dates = getDatesBetween(startDate, endDate);

        // Get lunch meals
        const lunchMeals = await Meal.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate },
            mealType: 'lunch'
        });

        // Build daily details
        let totalMeals = 0;
        let daysOn = 0;

        const dailyDetails = dates.map(date => {
            const dateStr = formatDate(date);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);
            const holiday = holidays.find(h => formatDate(h.date) === dateStr);
            const meal = lunchMeals.find(m => formatDate(m.date) === dateStr);

            let isOn, count, isManuallySet = false;
            if (meal) {
                isOn = meal.isOn;
                count = meal.count;
                isManuallySet = true;
            } else {
                isOn = !isDefaultOff;
                count = isOn ? 1 : 0;
            }

            if (isOn) {
                totalMeals += count;
                daysOn++;
            }

            return {
                date: dateStr,
                dayName: new Date(date).toLocaleDateString('bn-BD', { weekday: 'short' }),
                isOn,
                count,
                isManuallySet,
                isHoliday: !!holiday,
                holidayName: holiday?.nameBn,
                isWeekend: isDefaultOff && !holiday
            };
        });

        const totalCharge = totalMeals * lunchRate;
        const currentBalance = user.balances?.lunch?.amount || 0;
        const due = totalCharge - currentBalance;

        res.json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            },
            group: user.group ? { _id: user.group._id, name: user.group.name } : null,
            period: {
                startDate,
                endDate,
                year: startDate.getFullYear(),
                month: startDate.getMonth() + 1,
                totalDays: dates.length
            },
            dailyDetails,
            summary: {
                totalDays: daysOn,
                totalMeals,
                rate: lunchRate,
                totalCharge,
                currentBalance,
                dueAdvance: {
                    amount: Math.abs(due),
                    type: due > 0 ? 'due' : due < 0 ? 'advance' : 'settled'
                }
            },
            generatedBy: req.user.name,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/group-reports/user/:userId/lunch-statement/pdf
// @desc    Download lunch statement PDF for a specific user
// @access  Private (Manager+)
router.get('/user/:userId/lunch-statement/pdf', protect, isManager, canAccessGroup, checkGroupPermission('canManagerViewReports'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month, startDate: customStart, endDate: customEnd } = req.query;

        // Check if user belongs to manager's group
        const user = await User.findById(userId).select('-password').populate('group', 'name');
        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // For managers, verify user is in their group
        if (req.user.role === 'manager' && req.group) {
            if (!user.group || user.group._id.toString() !== req.group._id.toString()) {
                return res.status(403).json({ message: 'এই ইউজার আপনার গ্রুপের সদস্য নয়' });
            }
        }

        // Determine date range
        let startDate, endDate, lunchRate = 0;

        if (customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
            const monthSettings = await MonthSettings.findOne({
                year: startDate.getFullYear(),
                month: startDate.getMonth() + 1
            });
            lunchRate = monthSettings?.lunchRate || 0;
        } else if (year && month) {
            const monthSettings = await MonthSettings.findOne({
                year: parseInt(year),
                month: parseInt(month)
            });

            if (monthSettings) {
                startDate = monthSettings.startDate;
                endDate = monthSettings.endDate;
                lunchRate = monthSettings.lunchRate || 0;
            } else {
                const range = getDefaultMonthRange(parseInt(year), parseInt(month));
                startDate = range.startDate;
                endDate = range.endDate;
            }
        } else {
            return res.status(400).json({ message: 'সময়কাল প্রয়োজন' });
        }

        // Get holidays
        const holidays = await Holiday.find({
            date: { $gte: startDate, $lte: endDate },
            isActive: true
        });
        const holidayDates = holidays.map(h => h.date);
        const dates = getDatesBetween(startDate, endDate);

        // Get lunch meals
        const lunchMeals = await Meal.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate },
            mealType: 'lunch'
        });

        // Build daily details
        let totalMeals = 0;
        let daysOn = 0;

        const dailyDetails = dates.map(date => {
            const dateStr = formatDate(date);
            const isDefaultOff = isDefaultMealOff(date, holidayDates);
            const holiday = holidays.find(h => formatDate(h.date) === dateStr);
            const meal = lunchMeals.find(m => formatDate(m.date) === dateStr);

            let isOn, count, isManuallySet = false;
            if (meal) {
                isOn = meal.isOn;
                count = meal.count;
                isManuallySet = true;
            } else {
                isOn = !isDefaultOff;
                count = isOn ? 1 : 0;
            }

            if (isOn) {
                totalMeals += count;
                daysOn++;
            }

            return {
                date: dateStr,
                dayName: new Date(date).toLocaleDateString('bn-BD', { weekday: 'short' }),
                isOn,
                count,
                isManuallySet,
                isHoliday: !!holiday,
                holidayName: holiday?.nameBn,
                isWeekend: isDefaultOff && !holiday
            };
        });

        const totalCharge = totalMeals * lunchRate;
        const currentBalance = user.balances?.lunch?.amount || 0;
        const due = totalCharge - currentBalance;

        // Generate PDF
        const pdfData = {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            },
            group: user.group ? { _id: user.group._id, name: user.group.name } : null,
            period: {
                startDate,
                endDate,
                year: startDate.getFullYear(),
                month: startDate.getMonth() + 1,
                totalDays: dates.length
            },
            dailyDetails,
            summary: {
                totalDays: daysOn,
                totalMeals,
                rate: lunchRate,
                totalCharge,
                currentBalance,
                dueAdvance: {
                    amount: Math.abs(due),
                    type: due > 0 ? 'due' : due < 0 ? 'advance' : 'settled'
                }
            },
            generatedBy: req.user.name
        };

        generateLunchStatementPDF(pdfData, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/group-reports/group-statement/pdf
// @desc    Download group lunch statement PDF for all members
// @access  Private (Manager+)
router.get('/group-statement/pdf', protect, isManager, canAccessGroup, checkGroupPermission('canManagerViewReports'), async (req, res) => {
    try {
        const { year, month, groupId: queryGroupId } = req.query;
        const groupId = req.group?._id || queryGroupId;

        if (!groupId) {
            return res.status(400).json({ message: 'গ্রুপ আইডি প্রয়োজন' });
        }

        // Get group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: 'গ্রুপ পাওয়া যায়নি' });
        }

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
        const dates = getDatesBetween(monthSettings.startDate, monthSettings.endDate);

        // Get group members
        const users = await User.find({
            group: groupId,
            isActive: true,
            isDeleted: { $ne: true }
        }).select('name email phone balances');

        // Get all lunch meals
        const userIds = users.map(u => u._id);
        const allLunchMeals = await Meal.find({
            user: { $in: userIds },
            date: { $gte: monthSettings.startDate, $lte: monthSettings.endDate },
            mealType: 'lunch'
        });

        // Calculate for each member
        const members = users.map(user => {
            const userMeals = allLunchMeals.filter(m => m.user.toString() === user._id.toString());
            let totalMeals = 0;

            dates.forEach(date => {
                const dateStr = formatDate(date);
                const isDefaultOff = isDefaultMealOff(date, holidayDates);
                const meal = userMeals.find(m => formatDate(m.date) === dateStr);

                let isOn, count;
                if (meal) {
                    isOn = meal.isOn;
                    count = meal.count;
                } else {
                    isOn = !isDefaultOff;
                    count = isOn ? 1 : 0;
                }

                if (isOn) totalMeals += count;
            });

            const totalCharge = totalMeals * (monthSettings.lunchRate || 0);
            const balance = user.balances?.lunch?.amount || 0;
            const due = totalCharge - balance;

            return {
                name: user.name,
                email: user.email,
                phone: user.phone,
                totalMeals,
                totalCharge,
                balance,
                dueAdvance: {
                    amount: Math.abs(due),
                    type: due > 0 ? 'due' : due < 0 ? 'advance' : 'settled'
                }
            };
        });

        // Sort by name
        members.sort((a, b) => a.name.localeCompare(b.name, 'bn'));

        // Summary
        const summary = {
            totalMeals: members.reduce((sum, m) => sum + m.totalMeals, 0),
            totalCharge: members.reduce((sum, m) => sum + m.totalCharge, 0),
            totalDue: members.filter(m => m.dueAdvance.type === 'due').reduce((sum, m) => sum + m.dueAdvance.amount, 0)
        };

        // Generate PDF
        const pdfData = {
            group: { _id: group._id, name: group.name },
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate: monthSettings.startDate,
                endDate: monthSettings.endDate,
                lunchRate: monthSettings.lunchRate || 0
            },
            members,
            summary,
            generatedBy: req.user.name
        };

        generateGroupLunchStatementPDF(pdfData, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
