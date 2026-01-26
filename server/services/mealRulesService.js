/**
 * Centralized Meal Rules Service
 * Handles all dynamic and configurable meal rules from GlobalSettings
 */

const GlobalSettings = require('../models/GlobalSettings');
const MonthSettings = require('../models/MonthSettings');
const Holiday = require('../models/Holiday');

/**
 * Check if a date is Friday
 */
const isFriday = (date) => new Date(date).getDay() === 5;

/**
 * Check if a date is Saturday
 */
const isSaturday = (date) => new Date(date).getDay() === 6;

/**
 * Check if a date is an odd Saturday (1st, 3rd, 5th)
 */
const isOddSaturday = (date) => {
    const d = new Date(date);
    if (d.getDay() !== 6) return false;
    const dayOfMonth = d.getDate();
    const saturdayNumber = Math.ceil(dayOfMonth / 7);
    return saturdayNumber % 2 === 1;
};

/**
 * Check if a date is an even Saturday (2nd, 4th)
 */
const isEvenSaturday = (date) => {
    const d = new Date(date);
    if (d.getDay() !== 6) return false;
    const dayOfMonth = d.getDate();
    const saturdayNumber = Math.ceil(dayOfMonth / 7);
    return saturdayNumber % 2 === 0;
};

/**
 * Get applicable holidays based on settings
 * @param {Date} date - The date to check
 * @param {Array} holidays - All holidays for the period
 * @param {Object} holidayPolicy - Holiday policy from GlobalSettings
 * @returns {Object|null} - Matching holiday or null
 */
const getApplicableHoliday = (date, holidays, holidayPolicy) => {
    const dateStr = new Date(date).toISOString().split('T')[0];

    for (const holiday of holidays) {
        const holidayStr = new Date(holiday.date).toISOString().split('T')[0];
        if (holidayStr !== dateStr) continue;

        // Check if this holiday type should be OFF based on policy
        const type = holiday.type || 'government';
        if (type === 'government' && holidayPolicy?.governmentHolidayOff) return holiday;
        if (type === 'optional' && holidayPolicy?.optionalHolidayOff) return holiday;
        if (type === 'religious' && holidayPolicy?.religiousHolidayOff) return holiday;
    }

    return null;
};

/**
 * Check if meal should be OFF by default based on GlobalSettings
 * @param {Date} date - The date to check
 * @param {Array} holidays - All holidays for the period (with type field)
 * @param {Object} settings - GlobalSettings object (optional, will fetch if not provided)
 * @returns {Promise<{isOff: boolean, reason: string|null, source: string}>}
 */
const isDefaultMealOff = async (date, holidays = [], settings = null) => {
    if (!settings) {
        settings = await GlobalSettings.getSettings();
    }

    const weekendPolicy = settings.weekendPolicy || {};
    const holidayPolicy = settings.holidayPolicy || {};
    const d = new Date(date);

    // Check Friday
    if (isFriday(d) && weekendPolicy.fridayOff !== false) {
        return { isOff: true, reason: 'শুক্রবার', source: 'weekend_policy' };
    }

    // Check Saturday policies
    if (isSaturday(d)) {
        // All Saturdays OFF
        if (weekendPolicy.saturdayOff) {
            return { isOff: true, reason: 'শনিবার', source: 'weekend_policy' };
        }
        // Odd Saturday OFF (1st, 3rd, 5th)
        if (isOddSaturday(d) && weekendPolicy.oddSaturdayOff !== false) {
            return { isOff: true, reason: 'বিজোড় শনিবার', source: 'weekend_policy' };
        }
        // Even Saturday OFF (2nd, 4th)
        if (isEvenSaturday(d) && weekendPolicy.evenSaturdayOff) {
            return { isOff: true, reason: 'জোড় শনিবার', source: 'weekend_policy' };
        }
    }

    // Check holidays with type filtering
    const applicableHoliday = getApplicableHoliday(d, holidays, holidayPolicy);
    if (applicableHoliday) {
        return {
            isOff: true,
            reason: applicableHoliday.nameBn || applicableHoliday.name || 'ছুটি',
            source: 'holiday',
            holiday: applicableHoliday
        };
    }

    return { isOff: false, reason: null, source: null };
};

/**
 * Check if cutoff time has passed for a meal type
 * @param {string} mealType - 'lunch' or 'dinner'
 * @param {Date} targetDate - The date being modified
 * @param {Object} settings - GlobalSettings (optional)
 * @returns {Promise<{passed: boolean, cutoffHour: number, currentHour: number}>}
 */
const isCutoffTimePassed = async (mealType, targetDate, settings = null) => {
    if (!settings) {
        settings = await GlobalSettings.getSettings();
    }

    const cutoffTimes = settings.cutoffTimes || { lunch: 10, dinner: 16 };
    const cutoffHour = cutoffTimes[mealType] || (mealType === 'lunch' ? 10 : 16);

    const now = new Date();
    const target = new Date(targetDate);

    // If target date is not today, cutoff doesn't apply
    if (target.toDateString() !== now.toDateString()) {
        return { passed: false, cutoffHour, currentHour: now.getHours(), isToday: false };
    }

    const currentHour = now.getHours();
    return {
        passed: currentHour >= cutoffHour,
        cutoffHour,
        currentHour,
        isToday: true
    };
};

/**
 * Check if a month is finalized (locked)
 * @param {Date} date - Date to check
 * @returns {Promise<{isFinalized: boolean, monthSettings: Object|null}>}
 */
const isMonthFinalized = async (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const monthSettings = await MonthSettings.findOne({ year, month });

    return {
        isFinalized: monthSettings?.isFinalized || false,
        monthSettings
    };
};

/**
 * Check if date is within current month (for manager control)
 * @param {Date} date - Date to check
 * @returns {Promise<{isCurrentMonth: boolean, monthSettings: Object|null}>}
 */
const isWithinCurrentMonth = async (date) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Try to get month settings
    let monthSettings = await MonthSettings.findOne({ year, month });

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    if (monthSettings) {
        const start = new Date(monthSettings.startDate);
        const end = new Date(monthSettings.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return {
            isCurrentMonth: d >= start && d <= end,
            monthSettings
        };
    }

    // Fallback to calendar month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return {
        isCurrentMonth: d >= monthStart && d <= monthEnd,
        monthSettings: null
    };
};

/**
 * Get comprehensive meal toggle permission for a user
 * @param {Object} params
 * @param {Object} params.user - User object with role
 * @param {Date} params.date - Target date
 * @param {string} params.mealType - 'lunch' or 'dinner'
 * @param {Object} params.settings - GlobalSettings (optional)
 * @returns {Promise<Object>} - Permission result with details
 */
const getMealTogglePermission = async ({ user, date, mealType, settings = null }) => {
    if (!settings) {
        settings = await GlobalSettings.getSettings();
    }

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isManager = ['manager', 'admin', 'superadmin'].includes(user.role);
    const isAdmin = ['admin', 'superadmin'].includes(user.role);
    const isSuperAdmin = user.role === 'superadmin';

    // SuperAdmin can always edit
    if (isSuperAdmin) {
        return {
            canToggle: true,
            reason: null,
            source: 'superadmin_override'
        };
    }

    // Check if month is finalized (Admin can still edit, others cannot)
    const { isFinalized, monthSettings } = await isMonthFinalized(d);
    if (isFinalized && !isAdmin) {
        return {
            canToggle: false,
            reason: 'এই মাস ফাইনালাইজ হয়ে গেছে',
            source: 'month_finalized'
        };
    }

    // Regular users: Can only toggle future dates
    if (!isManager) {
        if (d < today) {
            return {
                canToggle: false,
                reason: 'অতীতের তারিখ পরিবর্তন করা যাবে না',
                source: 'past_date'
            };
        }

        // Check cutoff time for today
        if (d.getTime() === today.getTime()) {
            const cutoff = await isCutoffTimePassed(mealType, d, settings);
            if (cutoff.passed) {
                return {
                    canToggle: false,
                    reason: `${mealType === 'lunch' ? 'দুপুরের' : 'রাতের'} খাবারের কাটঅফ টাইম (${cutoff.cutoffHour}:00) পার হয়ে গেছে`,
                    source: 'cutoff_passed'
                };
            }
        }

        return { canToggle: true, reason: null, source: 'user_future' };
    }

    // Manager: Can edit current month only
    if (!isAdmin) {
        const { isCurrentMonth } = await isWithinCurrentMonth(d);
        if (!isCurrentMonth) {
            return {
                canToggle: false,
                reason: 'ম্যানেজার শুধু বর্তমান মাসের তারিখ পরিবর্তন করতে পারবেন',
                source: 'not_current_month'
            };
        }
    }

    // Admin: Can edit any non-finalized month
    return { canToggle: true, reason: null, source: isAdmin ? 'admin_access' : 'manager_access' };
};

/**
 * Get effective meal status for a date
 * @param {Object} params
 * @param {Date} params.date - Target date
 * @param {string} params.mealType - 'lunch' or 'dinner'
 * @param {Object} params.manualMeal - Manually set meal record (if any)
 * @param {Array} params.holidays - Holidays for the period
 * @param {Object} params.settings - GlobalSettings (optional)
 * @returns {Promise<Object>} - Effective status with details
 */
const getEffectiveMealStatus = async ({ date, mealType, manualMeal, holidays, settings = null }) => {
    if (!settings) {
        settings = await GlobalSettings.getSettings();
    }

    // If manually set, that takes precedence
    if (manualMeal) {
        return {
            isOn: manualMeal.isOn,
            count: manualMeal.count || (manualMeal.isOn ? 1 : 0),
            source: 'manual',
            reason: 'ম্যানুয়ালি সেট করা'
        };
    }

    // Check default meal status from settings
    const defaultStatus = settings.defaultMealStatus || { lunch: true, dinner: true };
    const isDefaultOn = defaultStatus[mealType] !== false;

    // Check if should be OFF due to weekend/holiday policy
    const offCheck = await isDefaultMealOff(date, holidays, settings);

    if (offCheck.isOff) {
        return {
            isOn: false,
            count: 0,
            source: offCheck.source,
            reason: offCheck.reason
        };
    }

    // Return default ON status
    return {
        isOn: isDefaultOn,
        count: isDefaultOn ? 1 : 0,
        source: 'default',
        reason: isDefaultOn ? 'ডিফল্ট অন' : 'ডিফল্ট অফ'
    };
};

/**
 * Get all applicable holidays for a date range with type filtering
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Object} settings - GlobalSettings (optional)
 * @returns {Promise<Array>} - Filtered holidays
 */
const getApplicableHolidays = async (startDate, endDate, settings = null) => {
    if (!settings) {
        settings = await GlobalSettings.getSettings();
    }

    const holidayPolicy = settings.holidayPolicy || {
        governmentHolidayOff: true,
        optionalHolidayOff: false,
        religiousHolidayOff: true
    };

    // Get all holidays
    const allHolidays = await Holiday.find({
        date: { $gte: startDate, $lte: endDate },
        isActive: true
    });

    // Filter based on policy
    return allHolidays.filter(h => {
        const type = h.type || 'government';
        if (type === 'government') return holidayPolicy.governmentHolidayOff;
        if (type === 'optional') return holidayPolicy.optionalHolidayOff;
        if (type === 'religious') return holidayPolicy.religiousHolidayOff;
        return true;
    });
};

/**
 * Validate meal toggle request
 * @param {Object} params - All validation parameters
 * @returns {Promise<{valid: boolean, error: string|null, details: Object}>}
 */
const validateMealToggle = async ({ user, date, mealType, targetUserId }) => {
    const settings = await GlobalSettings.getSettings();

    // Check if user can toggle meals
    const permission = await getMealTogglePermission({ user, date, mealType, settings });

    if (!permission.canToggle) {
        return {
            valid: false,
            error: permission.reason,
            details: permission
        };
    }

    // For managers editing other users, check group permissions
    if (targetUserId && targetUserId.toString() !== user._id.toString()) {
        const isManager = ['manager', 'admin', 'superadmin'].includes(user.role);
        if (!isManager) {
            return {
                valid: false,
                error: 'অন্য ইউজারের মিল পরিবর্তন করার অনুমতি নেই',
                details: { source: 'unauthorized' }
            };
        }
    }

    return {
        valid: true,
        error: null,
        details: { permission, settings }
    };
};

module.exports = {
    // Core functions
    isDefaultMealOff,
    isCutoffTimePassed,
    isMonthFinalized,
    isWithinCurrentMonth,
    getMealTogglePermission,
    getEffectiveMealStatus,
    getApplicableHolidays,
    validateMealToggle,

    // Helper functions
    isFriday,
    isSaturday,
    isOddSaturday,
    isEvenSaturday,
    getApplicableHoliday
};
