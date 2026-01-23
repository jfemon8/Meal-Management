const AuditLog = require('../models/AuditLog');

/**
 * Audit Service
 * Provides easy-to-use methods for logging actions throughout the application
 */

// Action descriptions in Bengali
const actionDescriptions = {
    // Auth
    'login': 'সিস্টেমে লগইন করেছেন',
    'logout': 'সিস্টেম থেকে লগআউট করেছেন',
    'login_failed': 'লগইন ব্যর্থ হয়েছে',
    'password_change': 'পাসওয়ার্ড পরিবর্তন করেছেন',
    'password_reset': 'পাসওয়ার্ড রিসেট করেছেন',
    '2fa_enabled': 'টু-ফ্যাক্টর অথেনটিকেশন সক্রিয় করেছেন',
    '2fa_disabled': 'টু-ফ্যাক্টর অথেনটিকেশন নিষ্ক্রিয় করেছেন',

    // User
    'create_user': 'নতুন ইউজার তৈরি করেছেন',
    'update_user': 'ইউজার তথ্য আপডেট করেছেন',
    'delete_user': 'ইউজার সফট ডিলিট করেছেন',
    'restore_user': 'ইউজার রিস্টোর করেছেন',
    'change_role': 'ইউজারের রোল পরিবর্তন করেছেন',
    'activate_user': 'ইউজার একটিভ করেছেন',
    'deactivate_user': 'ইউজার ডিএক্টিভ করেছেন',

    // Balance
    'deposit_balance': 'ব্যালেন্স জমা করেছেন',
    'deduct_balance': 'ব্যালেন্স কর্তন করেছেন',
    'adjust_balance': 'ব্যালেন্স সংশোধন করেছেন',
    'refund_balance': 'ব্যালেন্স ফেরত দিয়েছেন',
    'correct_transaction': 'ট্রানজেকশন সংশোধন করেছেন',
    'reverse_transaction': 'ট্রানজেকশন রিভার্স করেছেন',

    // Meal
    'toggle_meal_on': 'মিল চালু করেছেন',
    'toggle_meal_off': 'মিল বন্ধ করেছেন',
    'bulk_meal_update': 'বাল্ক মিল আপডেট করেছেন',
    'update_meal_count': 'মিল কাউন্ট আপডেট করেছেন',

    // Breakfast
    'submit_breakfast': 'ব্রেকফাস্ট খরচ জমা দিয়েছেন',
    'finalize_breakfast': 'ব্রেকফাস্ট ফাইনালাইজ করেছেন',
    'update_breakfast': 'ব্রেকফাস্ট আপডেট করেছেন',

    // Settings
    'create_month_settings': 'মাসের সেটিংস তৈরি করেছেন',
    'update_month_settings': 'মাসের সেটিংস আপডেট করেছেন',
    'finalize_month': 'মাস ফাইনালাইজ করেছেন',
    'update_global_settings': 'গ্লোবাল সেটিংস আপডেট করেছেন',
    'system_rate_update': 'সিস্টেম-ওয়াইড রেট আপডেট করেছেন',

    // Holiday
    'create_holiday': 'নতুন ছুটি যোগ করেছেন',
    'update_holiday': 'ছুটি আপডেট করেছেন',
    'delete_holiday': 'ছুটি মুছে ফেলেছেন',
    'sync_holidays': 'এপিআই থেকে ছুটি সিঙ্ক করেছেন',

    // Report
    'generate_report': 'রিপোর্ট জেনারেট করেছেন',
    'export_csv': 'CSV এক্সপোর্ট করেছেন',
    'export_pdf': 'PDF এক্সপোর্ট করেছেন',

    // Admin/SuperAdmin
    'reset_balances': 'ব্যালেন্স রিসেট করেছেন',
    'cleanup_database': 'ডাটাবেস ক্লিনআপ করেছেন',
    'bulk_operation': 'বাল্ক অপারেশন করেছেন',
    'toggle_feature_flag': 'ফিচার ফ্ল্যাগ টগল করেছেন',
    'update_feature_flag': 'ফিচার ফ্ল্যাগ আপডেট করেছেন',

    // Rule Override
    'create_override': 'নতুন রুল ওভাররাইড তৈরি করেছেন',
    'update_override': 'রুল ওভাররাইড আপডেট করেছেন',
    'delete_override': 'রুল ওভাররাইড মুছে ফেলেছেন',

    // System
    'send_notification': 'নোটিফিকেশন পাঠিয়েছেন',
    'send_announcement': 'অ্যানাউন্সমেন্ট পাঠিয়েছেন'
};

/**
 * Log an action
 */
const logAction = async (req, options) => {
    try {
        const {
            category,
            action,
            targetModel = null,
            targetId = null,
            description = null,
            previousData = null,
            newData = null,
            metadata = {},
            status = 'success',
            errorMessage = '',
            isReversible = false
        } = options;

        // Get user info from request
        const user = req.user?._id || req.user?.id;
        const userRole = req.user?.role || 'user';

        if (!user) {
            console.error('Audit log: No user in request');
            return null;
        }

        // Get IP and user agent
        const ipAddress = req.ip || req.connection?.remoteAddress || '';
        const userAgent = req.headers?.['user-agent'] || '';

        // Get description
        const finalDescription = description || actionDescriptions[action] || action;

        const log = await AuditLog.log({
            user,
            userRole,
            category,
            action,
            targetModel,
            targetId,
            description: finalDescription,
            previousData,
            newData,
            metadata,
            ipAddress,
            userAgent,
            status,
            errorMessage,
            isReversible
        });

        return log;
    } catch (error) {
        console.error('Audit service error:', error);
        return null;
    }
};

/**
 * Log authentication action
 */
const logAuth = async (req, action, options = {}) => {
    return logAction(req, {
        category: 'auth',
        action,
        ...options
    });
};

/**
 * Log user management action
 */
const logUser = async (req, action, targetId, options = {}) => {
    return logAction(req, {
        category: 'user',
        action,
        targetModel: 'User',
        targetId,
        ...options
    });
};

/**
 * Log balance/transaction action
 */
const logBalance = async (req, action, transactionId, options = {}) => {
    return logAction(req, {
        category: 'balance',
        action,
        targetModel: 'Transaction',
        targetId: transactionId,
        isReversible: true,
        ...options
    });
};

/**
 * Log meal action (summary - details in MealAuditLog)
 */
const logMeal = async (req, action, options = {}) => {
    return logAction(req, {
        category: 'meal',
        action,
        targetModel: 'Meal',
        ...options
    });
};

/**
 * Log breakfast action
 */
const logBreakfast = async (req, action, breakfastId, options = {}) => {
    return logAction(req, {
        category: 'breakfast',
        action,
        targetModel: 'Breakfast',
        targetId: breakfastId,
        ...options
    });
};

/**
 * Log settings action
 */
const logSettings = async (req, action, targetModel, targetId, options = {}) => {
    return logAction(req, {
        category: 'settings',
        action,
        targetModel,
        targetId,
        ...options
    });
};

/**
 * Log holiday action
 */
const logHoliday = async (req, action, holidayId, options = {}) => {
    return logAction(req, {
        category: 'holiday',
        action,
        targetModel: 'Holiday',
        targetId: holidayId,
        ...options
    });
};

/**
 * Log report action
 */
const logReport = async (req, action, options = {}) => {
    return logAction(req, {
        category: 'report',
        action,
        ...options
    });
};

/**
 * Log admin action
 */
const logAdmin = async (req, action, options = {}) => {
    return logAction(req, {
        category: 'admin',
        action,
        ...options
    });
};

/**
 * Log superadmin action
 */
const logSuperAdmin = async (req, action, options = {}) => {
    return logAction(req, {
        category: 'superadmin',
        action,
        ...options
    });
};

/**
 * Log system action
 */
const logSystem = async (req, action, options = {}) => {
    return logAction(req, {
        category: 'system',
        action,
        ...options
    });
};

/**
 * Undo an action (if reversible)
 */
const undoAction = async (auditLogId, undoneByUser) => {
    try {
        const originalLog = await AuditLog.findById(auditLogId);

        if (!originalLog) {
            throw new Error('অডিট লগ পাওয়া যায়নি');
        }

        if (!originalLog.isReversible) {
            throw new Error('এই অ্যাকশন রিভার্স করা যাবে না');
        }

        if (originalLog.isUndone) {
            throw new Error('এই অ্যাকশন ইতোমধ্যে রিভার্স করা হয়েছে');
        }

        // Mark as undone
        originalLog.isUndone = true;
        originalLog.undoneAt = new Date();
        await originalLog.save();

        return originalLog;
    } catch (error) {
        console.error('Undo action error:', error);
        throw error;
    }
};

module.exports = {
    logAction,
    logAuth,
    logUser,
    logBalance,
    logMeal,
    logBreakfast,
    logSettings,
    logHoliday,
    logReport,
    logAdmin,
    logSuperAdmin,
    logSystem,
    undoAction,
    actionDescriptions
};
