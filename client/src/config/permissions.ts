/**
 * Permission Constants for RBAC System (Frontend)
 * These should match the backend permissions exactly
 */

export const PERMISSIONS = {
    // Meal Management
    VIEW_OWN_MEALS: 'view_own_meals',
    TOGGLE_OWN_MEALS: 'toggle_own_meals',
    VIEW_ALL_MEALS: 'view_all_meals',
    MANAGE_ALL_MEALS: 'manage_all_meals',
    VIEW_DAILY_MEALS: 'view_daily_meals',

    // Breakfast Management
    VIEW_BREAKFAST: 'view_breakfast',
    SUBMIT_BREAKFAST: 'submit_breakfast',
    DEDUCT_BREAKFAST: 'deduct_breakfast',
    MANAGE_BREAKFAST: 'manage_breakfast',

    // User Management
    VIEW_OWN_PROFILE: 'view_own_profile',
    UPDATE_OWN_PROFILE: 'update_own_profile',
    VIEW_ALL_USERS: 'view_all_users',
    MANAGE_USERS: 'manage_users',
    UPDATE_USER_STATUS: 'update_user_status',
    DELETE_USERS: 'delete_users',

    // Balance Management
    VIEW_OWN_BALANCE: 'view_own_balance',
    VIEW_ALL_BALANCES: 'view_all_balances',
    UPDATE_BALANCES: 'update_balances',

    // Transaction Management
    VIEW_OWN_TRANSACTIONS: 'view_own_transactions',
    VIEW_USER_TRANSACTIONS: 'view_user_transactions',
    VIEW_ALL_TRANSACTIONS: 'view_all_transactions',

    // Month Settings
    VIEW_MONTH_SETTINGS: 'view_month_settings',
    MANAGE_MONTH_SETTINGS: 'manage_month_settings',
    FINALIZE_MONTH: 'finalize_month',

    // Holiday Management
    VIEW_HOLIDAYS: 'view_holidays',
    MANAGE_HOLIDAYS: 'manage_holidays',

    // Reports
    VIEW_OWN_REPORTS: 'view_own_reports',
    VIEW_ALL_REPORTS: 'view_all_reports',
    VIEW_DAILY_REPORTS: 'view_daily_reports',

    // Role Management
    VIEW_ROLES: 'view_roles',
    CHANGE_USER_ROLES: 'change_user_roles',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Permission Groups for easier UI organization
 */
export const PERMISSION_GROUPS = {
    MEALS: [
        PERMISSIONS.VIEW_OWN_MEALS,
        PERMISSIONS.TOGGLE_OWN_MEALS,
        PERMISSIONS.VIEW_ALL_MEALS,
        PERMISSIONS.MANAGE_ALL_MEALS,
        PERMISSIONS.VIEW_DAILY_MEALS,
    ],
    BREAKFAST: [
        PERMISSIONS.VIEW_BREAKFAST,
        PERMISSIONS.SUBMIT_BREAKFAST,
        PERMISSIONS.DEDUCT_BREAKFAST,
        PERMISSIONS.MANAGE_BREAKFAST,
    ],
    USERS: [
        PERMISSIONS.VIEW_OWN_PROFILE,
        PERMISSIONS.UPDATE_OWN_PROFILE,
        PERMISSIONS.VIEW_ALL_USERS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.UPDATE_USER_STATUS,
        PERMISSIONS.DELETE_USERS,
    ],
    BALANCES: [
        PERMISSIONS.VIEW_OWN_BALANCE,
        PERMISSIONS.VIEW_ALL_BALANCES,
        PERMISSIONS.UPDATE_BALANCES,
    ],
    TRANSACTIONS: [
        PERMISSIONS.VIEW_OWN_TRANSACTIONS,
        PERMISSIONS.VIEW_USER_TRANSACTIONS,
        PERMISSIONS.VIEW_ALL_TRANSACTIONS,
    ],
    SETTINGS: [
        PERMISSIONS.VIEW_MONTH_SETTINGS,
        PERMISSIONS.MANAGE_MONTH_SETTINGS,
        PERMISSIONS.FINALIZE_MONTH,
    ],
    HOLIDAYS: [
        PERMISSIONS.VIEW_HOLIDAYS,
        PERMISSIONS.MANAGE_HOLIDAYS,
    ],
    REPORTS: [
        PERMISSIONS.VIEW_OWN_REPORTS,
        PERMISSIONS.VIEW_ALL_REPORTS,
        PERMISSIONS.VIEW_DAILY_REPORTS,
    ],
    ROLES: [
        PERMISSIONS.VIEW_ROLES,
        PERMISSIONS.CHANGE_USER_ROLES,
    ],
} as const;

/**
 * Permission Labels (Bengali)
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
    // Meals
    [PERMISSIONS.VIEW_OWN_MEALS]: 'নিজের মিল দেখা',
    [PERMISSIONS.TOGGLE_OWN_MEALS]: 'নিজের মিল চালু/বন্ধ করা',
    [PERMISSIONS.VIEW_ALL_MEALS]: 'সকল মিল দেখা',
    [PERMISSIONS.MANAGE_ALL_MEALS]: 'সকল মিল পরিচালনা',
    [PERMISSIONS.VIEW_DAILY_MEALS]: 'দৈনিক মিল দেখা',

    // Breakfast
    [PERMISSIONS.VIEW_BREAKFAST]: 'নাস্তা দেখা',
    [PERMISSIONS.SUBMIT_BREAKFAST]: 'নাস্তা জমা দেওয়া',
    [PERMISSIONS.DEDUCT_BREAKFAST]: 'নাস্তা কর্তন',
    [PERMISSIONS.MANAGE_BREAKFAST]: 'নাস্তা পরিচালনা',

    // Users
    [PERMISSIONS.VIEW_OWN_PROFILE]: 'নিজের প্রোফাইল দেখা',
    [PERMISSIONS.UPDATE_OWN_PROFILE]: 'নিজের প্রোফাইল আপডেট',
    [PERMISSIONS.VIEW_ALL_USERS]: 'সকল ইউজার দেখা',
    [PERMISSIONS.MANAGE_USERS]: 'ইউজার পরিচালনা',
    [PERMISSIONS.UPDATE_USER_STATUS]: 'ইউজার স্ট্যাটাস পরিবর্তন',
    [PERMISSIONS.DELETE_USERS]: 'ইউজার মুছে ফেলা',

    // Balances
    [PERMISSIONS.VIEW_OWN_BALANCE]: 'নিজের ব্যালেন্স দেখা',
    [PERMISSIONS.VIEW_ALL_BALANCES]: 'সকল ব্যালেন্স দেখা',
    [PERMISSIONS.UPDATE_BALANCES]: 'ব্যালেন্স আপডেট করা',

    // Transactions
    [PERMISSIONS.VIEW_OWN_TRANSACTIONS]: 'নিজের লেনদেন দেখা',
    [PERMISSIONS.VIEW_USER_TRANSACTIONS]: 'ইউজারের লেনদেন দেখা',
    [PERMISSIONS.VIEW_ALL_TRANSACTIONS]: 'সকল লেনদেন দেখা',

    // Month Settings
    [PERMISSIONS.VIEW_MONTH_SETTINGS]: 'মাসের সেটিংস দেখা',
    [PERMISSIONS.MANAGE_MONTH_SETTINGS]: 'মাসের সেটিংস পরিচালনা',
    [PERMISSIONS.FINALIZE_MONTH]: 'মাস ফাইনালাইজ করা',

    // Holidays
    [PERMISSIONS.VIEW_HOLIDAYS]: 'ছুটির দিন দেখা',
    [PERMISSIONS.MANAGE_HOLIDAYS]: 'ছুটির দিন পরিচালনা',

    // Reports
    [PERMISSIONS.VIEW_OWN_REPORTS]: 'নিজের রিপোর্ট দেখা',
    [PERMISSIONS.VIEW_ALL_REPORTS]: 'সকল রিপোর্ট দেখা',
    [PERMISSIONS.VIEW_DAILY_REPORTS]: 'দৈনিক রিপোর্ট দেখা',

    // Roles
    [PERMISSIONS.VIEW_ROLES]: 'রোল দেখা',
    [PERMISSIONS.CHANGE_USER_ROLES]: 'ইউজার রোল পরিবর্তন',
};

/**
 * Role Labels (Bengali)
 */
export const ROLE_LABELS = {
    user: 'ইউজার',
    manager: 'ম্যানেজার',
    admin: 'অ্যাডমিন',
    superadmin: 'সুপার অ্যাডমিন',
} as const;

export type UserRole = keyof typeof ROLE_LABELS;
