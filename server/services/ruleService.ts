import RuleOverride from '../models/RuleOverride';
import Meal from '../models/Meal';
import { isFriday, isOddSaturday, formatDate } from '../utils/dateUtils';
import { Types } from 'mongoose';
import { MealType, UserRole, IRuleOverrideDocument, IMealDocument } from '../types';

/**
 * Priority levels for meal status determination
 */
const PRIORITY: Record<string, number> = {
    SYSTEM: 1,      // System defaults (Friday OFF, Saturday OFF, Holiday)
    USER: 2,        // User manual toggle
    MANAGER: 3,     // Manager override
    ADMIN: 4        // Admin/Superadmin override
};

interface EffectiveStatus {
    isOn: boolean;
    source: string;
    priority: number;
    reason: string;
    reasonBn: string;
    mealId?: Types.ObjectId;
    count?: number;
    overrideId?: Types.ObjectId;
    createdBy?: { _id: Types.ObjectId; name: string } | null;
}

/**
 * Get priority level based on role
 */
const getPriorityForRole = (role: string): number => {
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
 */
const getApplicableOverrides = async (date: Date | string, userId: Types.ObjectId | string, mealType: string = 'lunch'): Promise<any[]> => {
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
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    })
    .populate('createdBy', 'name role')
    .sort({ priority: -1, createdAt: -1 });

    // Filter to only those that apply to the given date
    const applicable = overrides.filter((override: any) => override.appliesToDate(d));

    return applicable;
};

/**
 * Determine effective meal status for a user on a specific date
 * Considers all rule priorities: Admin > Manager > User Manual > System Default
 */
const getEffectiveMealStatus = async (date: Date | string, userId: Types.ObjectId | string, mealType: string = 'lunch', holidayDates: (Date | string)[] = []): Promise<EffectiveStatus> => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dateStr = formatDate(d);

    // Step 1: Determine system default status
    let effectiveStatus: EffectiveStatus = {
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
        const isHoliday = holidayDates.some((h: Date | string) => formatDate(new Date(h)) === dateStr);
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
    const manualMeal: any = await Meal.findOne({
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
 */
const createOverride = async (data: Record<string, any>, createdBy: Types.ObjectId | string, createdByRole: string): Promise<any> => {
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
 */
const canCreateOverride = (userRole: string, targetType: string): boolean => {
    // Only admin/superadmin can create global or all_users overrides
    if (['global', 'all_users'].includes(targetType)) {
        return ['admin', 'superadmin'].includes(userRole);
    }
    // Manager+ can create user-specific overrides
    return ['manager', 'admin', 'superadmin'].includes(userRole);
};

/**
 * Check if user can modify/delete an override
 */
const canModifyOverride = (override: any, userId: Types.ObjectId | string, userRole: string): boolean => {
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

export {
    PRIORITY,
    getPriorityForRole,
    getApplicableOverrides,
    getEffectiveMealStatus,
    createOverride,
    canCreateOverride,
    canModifyOverride
};
