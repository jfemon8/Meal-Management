import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Permission } from '../config/permissions';

/**
 * Hook to check user permissions
 */
export const usePermissions = () => {
    const { user } = useAuth();

    return useMemo(() => {
        const permissions = user?.permissions || [];

        return {
            /**
             * Check if user has a specific permission
             */
            hasPermission: (permission: Permission): boolean => {
                return permissions.includes(permission);
            },

            /**
             * Check if user has any of the given permissions (OR logic)
             */
            hasAnyPermission: (requiredPermissions: Permission[]): boolean => {
                return requiredPermissions.some(perm => permissions.includes(perm));
            },

            /**
             * Check if user has all of the given permissions (AND logic)
             */
            hasAllPermissions: (requiredPermissions: Permission[]): boolean => {
                return requiredPermissions.every(perm => permissions.includes(perm));
            },

            /**
             * Get all user permissions
             */
            permissions,

            /**
             * Check if user has any permissions at all
             */
            hasAnyPermissions: permissions.length > 0,
        };
    }, [user?.permissions]);
};

/**
 * Hook to check a specific permission
 * Useful for conditional rendering
 */
export const useHasPermission = (permission: Permission): boolean => {
    const { hasPermission } = usePermissions();
    return hasPermission(permission);
};

/**
 * Hook to check multiple permissions (ANY logic)
 */
export const useHasAnyPermission = (permissions: Permission[]): boolean => {
    const { hasAnyPermission } = usePermissions();
    return hasAnyPermission(permissions);
};

/**
 * Hook to check multiple permissions (ALL logic)
 */
export const useHasAllPermissions = (permissions: Permission[]): boolean => {
    const { hasAllPermissions } = usePermissions();
    return hasAllPermissions(permissions);
};
