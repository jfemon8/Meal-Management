const RuleOverride = require('../models/RuleOverride');
const Meal = require('../models/Meal');
const { isFriday, isOddSaturday, formatDate } = require('../utils/dateUtils');

/**
 * Priority levels for meal status determination
 */
const PRIORITY = {
    SYSTEM: 1,      // System defaults (Friday OFF, Saturday OFF, Holiday)
    USER: 2,        // User manual toggle
    MANAGER: 3,     // Manager override
    ADMIN: 4        // Admin/Superadmin override
};

/**
 * Get priority level based on role
 * @param {string} role - User role
 * @returns {number} - Priority level
 */
const getPriorityForRole = (role) => {
    switch (role) {
        case 'superadmin':
        case 'admin':
            return PRIORITY.ADMIN;
        case 'manager':
            return PRIORITY.MANAGER;
        case 'user':
            return PRIORITY.USER;
        default:
            return PRIORITY.SYSTEM;
    }
};

/**
 * Get all applicable overrides for a specific date and user
 * @param {Date} date - Target date
 * @param {ObjectId} userId - Target user ID
 * @param {string} mealType - 'lunch' or 'dinner'
 * @returns {Promise<Array>} - Array of applicable overrides sorted by priority (highest first)
 */
const getApplicableOverrides = async (date, userId, mealType = 'lunch') => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Find all potentially applicable overrides
    const overrides = await RuleOverride.find({
        isActive: true,
        mealType: { $in: [mealType, 'both'] },
        $or: [
            // Global rules
            { targetType: 'global' },
            // All users rules
            { targetType: 'all_users' },
            // User-specific rules
            { targetType: 'user', targetUser: userId }
        ],
        // Not expired
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .populate('createdBy', 'name role')
    .sort({ priority: -1, createdAt: -1 });

    // Filter to only those that apply to the given date
    const applicable = overrides.filter(override => override.appliesToDate(d));

    return applicable;
};

/**
 * Determine effective meal status for a user on a specific date
 * Considers all rule priorities: Admin > Manager > User Manual > System Default
 *
 * @param {Date} date - Target date
 * @param {ObjectId} userId - Target user ID
 * @param {string} mealType - 'lunch' or 'dinner'
 * @param {Array} holidayDates - Array of holiday dates
 * @returns {Promise<Object>} - { isOn, source, priority, reason, overrideId?, mealId? }
 */
const getEffectiveMealStatus = async (date, userId, mealType = 'lunch', holidayDates = []) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dateStr = formatDate(d);

    // Step 1: Determine system default status
    let effectiveStatus = {
        isOn: true,
        source: 'system_default',
        priority: PRIORITY.SYSTEM,
        reason: 'ডিফল্ট: মিল অন',
        reasonBn: 'ডিফল্ট: মিল অন'
    };

    // Check Friday
    if (isFriday(d)) {
        effectiveStatus = {
            isOn: false,
            source: 'system_friday',
            priority: PRIORITY.SYSTEM,
            reason: 'Friday - System default OFF',
            reasonBn: 'শুক্রবার - সিস্টেম ডিফল্ট অফ'
        };
    }
    // Check Odd Saturday
    else if (isOddSaturday(d)) {
        effectiveStatus = {
            isOn: false,
            source: 'system_odd_saturday',
            priority: PRIORITY.SYSTEM,
            reason: 'Odd Saturday - System default OFF',
            reasonBn: 'বিজোড় শনিবার - সিস্টেম ডিফল্ট অফ'
        };
    }
    // Check Holiday
    else {
        const isHoliday = holidayDates.some(h => formatDate(new Date(h)) === dateStr);
        if (isHoliday) {
            effectiveStatus = {
                isOn: false,
                source: 'system_holiday',
                priority: PRIORITY.SYSTEM,
                reason: 'Holiday - System default OFF',
                reasonBn: 'ছুটির দিন - সিস্টেম ডিফল্ট অফ'
            };
        }
    }

    // Step 2: Check manual meal setting (user toggle - priority 2)
    const manualMeal = await Meal.findOne({
        user: userId,
        date: d,
        mealType,
        isManuallySet: true
    });

    if (manualMeal) {
        // Only override if priority is higher than current
        if (PRIORITY.USER > effectiveStatus.priority) {
            effectiveStatus = {
                isOn: manualMeal.isOn,
                source: 'user_manual',
                priority: PRIORITY.USER,
                reason: 'Manual setting by user',
                reasonBn: 'ইউজারের ম্যানুয়াল সেটিং',
                mealId: manualMeal._id,
                count: manualMeal.count
            };
        }
    }

    // Step 3: Get and apply rule overrides (manager/admin - priority 3-4)
    const overrides = await getApplicableOverrides(d, userId, mealType);

    // Find the highest priority override that beats current status
    for (const override of overrides) {
        if (override.priority > effectiveStatus.priority) {
            effectiveStatus = {
                isOn: override.action === 'force_on',
                source: `override_${override.createdByRole}`,
                priority: override.priority,
                reason: override.reason || `Override by ${override.createdByRole}`,
                reasonBn: override.reasonBn || `${override.createdByRole} ওভাররাইড`,
                overrideId: override._id,
                createdBy: override.createdBy ? {
                    _id: override.createdBy._id,
                    name: override.createdBy.name
                } : null
            };
            break; // First matching override wins (already sorted by priority desc)
        }
    }

    return effectiveStatus;
};

/**
 * Create a new rule override
 * @param {Object} data - Override data
 * @param {ObjectId} createdBy - User creating the override
 * @param {string} createdByRole - Role of user creating the override
 * @returns {Promise<Object>} - Created override
 */
const createOverride = async (data, createdBy, createdByRole) => {
    const priority = getPriorityForRole(createdByRole);

    const override = await RuleOverride.create({
        ...data,
        priority,
        createdByRole,
        createdBy
    });

    return override;
};

/**
 * Check if user can create override for given target
 * @param {string} userRole - Current user's role
 * @param {string} targetType - 'user', 'all_users', or 'global'
 * @returns {boolean}
 */
const canCreateOverride = (userRole, targetType) => {
    // Only admin/superadmin can create global or all_users overrides
    if (['global', 'all_users'].includes(targetType)) {
        return ['admin', 'superadmin'].includes(userRole);
    }
    // Manager+ can create user-specific overrides
    return ['manager', 'admin', 'superadmin'].includes(userRole);
};

/**
 * Check if user can modify/delete an override
 * @param {Object} override - The override document
 * @param {ObjectId} userId - Current user's ID
 * @param {string} userRole - Current user's role
 * @returns {boolean}
 */
const canModifyOverride = (override, userId, userRole) => {
    // Admin/superadmin can modify any override
    if (['admin', 'superadmin'].includes(userRole)) {
        return true;
    }
    // Manager can modify their own overrides
    if (userRole === 'manager' && override.createdBy?.toString() === userId.toString()) {
        return true;
    }
    return false;
};

module.exports = {
    PRIORITY,
    getPriorityForRole,
    getApplicableOverrides,
    getEffectiveMealStatus,
    createOverride,
    canCreateOverride,
    canModifyOverride
};
