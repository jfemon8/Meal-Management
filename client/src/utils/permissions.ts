/**
 * Permission Utilities - Central export for all permission-related functionality
 */

import { PERMISSION_LABELS, Permission } from '../config/permissions';

// Export permission constants
export {
    PERMISSIONS,
    PERMISSION_GROUPS,
    PERMISSION_LABELS,
    ROLE_LABELS,
    type Permission,
    type UserRole,
} from '../config/permissions';

// Export permission hooks
export {
    usePermissions,
    useHasPermission,
    useHasAnyPermission,
    useHasAllPermissions,
} from '../hooks/usePermissions';

// Export permission components
export { PermissionGate, RequirePermission } from '../components/Auth/PermissionGate';
export { default as ProtectedRoute } from '../components/Auth/ProtectedRoute';

/**
 * Helper function to get permission label
 */

export const getPermissionLabel = (permission: Permission): string => {
    return PERMISSION_LABELS[permission] || permission;
};

/**
 * Helper function to format permissions list
 */
export const formatPermissions = (permissions: Permission[]): string[] => {
    return permissions.map(getPermissionLabel);
};
