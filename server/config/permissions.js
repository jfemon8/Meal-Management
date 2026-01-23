/**
 * Permission Constants for RBAC System
 * Each permission represents a specific action in the system
 */

const PERMISSIONS = {
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
    FREEZE_BALANCE: 'balance:freeze',

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
};

/**
 * Permission Matrix - Maps roles to their permissions
 * Permissions are additive: higher roles inherit all lower role permissions
 */
const ROLE_PERMISSIONS = {
    user: [
        // Meal permissions
        PERMISSIONS.VIEW_OWN_MEALS,
        PERMISSIONS.TOGGLE_OWN_MEALS,

        // Profile permissions
        PERMISSIONS.VIEW_OWN_PROFILE,
        PERMISSIONS.UPDATE_OWN_PROFILE,

        // Balance permissions
        PERMISSIONS.VIEW_OWN_BALANCE,

        // Transaction permissions
        PERMISSIONS.VIEW_OWN_TRANSACTIONS,

        // Month settings (read-only)
        PERMISSIONS.VIEW_MONTH_SETTINGS,

        // Holidays (read-only)
        PERMISSIONS.VIEW_HOLIDAYS,

        // Reports (own only)
        PERMISSIONS.VIEW_OWN_REPORTS,
    ],

    manager: [
        // User permissions (inherited)
        PERMISSIONS.VIEW_OWN_MEALS,
        PERMISSIONS.TOGGLE_OWN_MEALS,
        PERMISSIONS.VIEW_OWN_PROFILE,
        PERMISSIONS.UPDATE_OWN_PROFILE,
        PERMISSIONS.VIEW_OWN_BALANCE,
        PERMISSIONS.VIEW_OWN_TRANSACTIONS,
        PERMISSIONS.VIEW_MONTH_SETTINGS,
        PERMISSIONS.VIEW_HOLIDAYS,
        PERMISSIONS.VIEW_OWN_REPORTS,

        // Extended meal permissions
        PERMISSIONS.VIEW_ALL_MEALS,
        PERMISSIONS.MANAGE_ALL_MEALS,
        PERMISSIONS.VIEW_DAILY_MEALS,

        // Breakfast management
        PERMISSIONS.VIEW_BREAKFAST,
        PERMISSIONS.SUBMIT_BREAKFAST,
        PERMISSIONS.DEDUCT_BREAKFAST,
        PERMISSIONS.MANAGE_BREAKFAST,

        // User viewing
        PERMISSIONS.VIEW_ALL_USERS,

        // Balance management
        PERMISSIONS.VIEW_ALL_BALANCES,
        PERMISSIONS.UPDATE_BALANCES,
        PERMISSIONS.FREEZE_BALANCE,

        // Transaction viewing
        PERMISSIONS.VIEW_USER_TRANSACTIONS,
        PERMISSIONS.VIEW_ALL_TRANSACTIONS,

        // Month settings management
        PERMISSIONS.MANAGE_MONTH_SETTINGS,
        PERMISSIONS.FINALIZE_MONTH,

        // Extended reports
        PERMISSIONS.VIEW_ALL_REPORTS,
        PERMISSIONS.VIEW_DAILY_REPORTS,
    ],

    admin: [
        // User permissions (inherited)
        PERMISSIONS.VIEW_OWN_MEALS,
        PERMISSIONS.TOGGLE_OWN_MEALS,
        PERMISSIONS.VIEW_OWN_PROFILE,
        PERMISSIONS.UPDATE_OWN_PROFILE,
        PERMISSIONS.VIEW_OWN_BALANCE,
        PERMISSIONS.VIEW_OWN_TRANSACTIONS,
        PERMISSIONS.VIEW_MONTH_SETTINGS,
        PERMISSIONS.VIEW_HOLIDAYS,
        PERMISSIONS.VIEW_OWN_REPORTS,

        // Manager permissions (inherited)
        PERMISSIONS.VIEW_ALL_MEALS,
        PERMISSIONS.MANAGE_ALL_MEALS,
        PERMISSIONS.VIEW_DAILY_MEALS,
        PERMISSIONS.VIEW_BREAKFAST,
        PERMISSIONS.SUBMIT_BREAKFAST,
        PERMISSIONS.DEDUCT_BREAKFAST,
        PERMISSIONS.MANAGE_BREAKFAST,
        PERMISSIONS.VIEW_ALL_USERS,
        PERMISSIONS.VIEW_ALL_BALANCES,
        PERMISSIONS.UPDATE_BALANCES,
        PERMISSIONS.FREEZE_BALANCE,
        PERMISSIONS.VIEW_USER_TRANSACTIONS,
        PERMISSIONS.VIEW_ALL_TRANSACTIONS,
        PERMISSIONS.MANAGE_MONTH_SETTINGS,
        PERMISSIONS.FINALIZE_MONTH,
        PERMISSIONS.VIEW_ALL_REPORTS,
        PERMISSIONS.VIEW_DAILY_REPORTS,

        // User management
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.UPDATE_USER_STATUS,

        // Holiday management
        PERMISSIONS.MANAGE_HOLIDAYS,

        // Role viewing
        PERMISSIONS.VIEW_ROLES,
    ],

    superadmin: [
        // User permissions (inherited)
        PERMISSIONS.VIEW_OWN_MEALS,
        PERMISSIONS.TOGGLE_OWN_MEALS,
        PERMISSIONS.VIEW_OWN_PROFILE,
        PERMISSIONS.UPDATE_OWN_PROFILE,
        PERMISSIONS.VIEW_OWN_BALANCE,
        PERMISSIONS.VIEW_OWN_TRANSACTIONS,
        PERMISSIONS.VIEW_MONTH_SETTINGS,
        PERMISSIONS.VIEW_HOLIDAYS,
        PERMISSIONS.VIEW_OWN_REPORTS,

        // Manager permissions (inherited)
        PERMISSIONS.VIEW_ALL_MEALS,
        PERMISSIONS.MANAGE_ALL_MEALS,
        PERMISSIONS.VIEW_DAILY_MEALS,
        PERMISSIONS.VIEW_BREAKFAST,
        PERMISSIONS.SUBMIT_BREAKFAST,
        PERMISSIONS.DEDUCT_BREAKFAST,
        PERMISSIONS.MANAGE_BREAKFAST,
        PERMISSIONS.VIEW_ALL_USERS,
        PERMISSIONS.VIEW_ALL_BALANCES,
        PERMISSIONS.UPDATE_BALANCES,
        PERMISSIONS.FREEZE_BALANCE,
        PERMISSIONS.VIEW_USER_TRANSACTIONS,
        PERMISSIONS.VIEW_ALL_TRANSACTIONS,
        PERMISSIONS.MANAGE_MONTH_SETTINGS,
        PERMISSIONS.FINALIZE_MONTH,
        PERMISSIONS.VIEW_ALL_REPORTS,
        PERMISSIONS.VIEW_DAILY_REPORTS,

        // Admin permissions (inherited)
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.UPDATE_USER_STATUS,
        PERMISSIONS.MANAGE_HOLIDAYS,
        PERMISSIONS.VIEW_ROLES,

        // SuperAdmin exclusive permissions
        PERMISSIONS.DELETE_USERS,
        PERMISSIONS.CHANGE_USER_ROLES,
    ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
    if (!role || !permission) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

/**
 * Check if user has any of the given permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions
 * @returns {boolean}
 */
const hasAnyPermission = (role, permissions) => {
    if (!role || !Array.isArray(permissions)) return false;
    return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if user has all of the given permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions
 * @returns {boolean}
 */
const hasAllPermissions = (role, permissions) => {
    if (!role || !Array.isArray(permissions)) return false;
    return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]}
 */
const getRolePermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if user has custom permission (from database)
 * @param {string[]} userPermissions - Custom permissions from user document
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasCustomPermission = (userPermissions, permission) => {
    if (!Array.isArray(userPermissions)) return false;
    return userPermissions.includes(permission);
};

module.exports = {
    PERMISSIONS,
    ROLE_PERMISSIONS,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRolePermissions,
    hasCustomPermission,
};

