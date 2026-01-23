import React, { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../config/permissions';

interface PermissionGateProps {
    /**
     * Single permission or array of permissions to check
     */
    permission?: Permission | Permission[];

    /**
     * Logic for checking multiple permissions
     * - 'any': User needs at least one permission (OR logic)
     * - 'all': User needs all permissions (AND logic)
     */
    logic?: 'any' | 'all';

    /**
     * Content to render if user has permission
     */
    children: ReactNode;

    /**
     * Optional content to render if user doesn't have permission
     */
    fallback?: ReactNode;

    /**
     * If true, renders nothing instead of fallback when permission is denied
     */
    hideOnDenied?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 *
 * @example
 * ```tsx
 * // Single permission
 * <PermissionGate permission={PERMISSIONS.MANAGE_USERS}>
 *   <button>Edit User</button>
 * </PermissionGate>
 *
 * // Multiple permissions (ANY)
 * <PermissionGate
 *   permission={[PERMISSIONS.VIEW_ALL_USERS, PERMISSIONS.MANAGE_USERS]}
 *   logic="any"
 * >
 *   <UserList />
 * </PermissionGate>
 *
 * // With fallback
 * <PermissionGate
 *   permission={PERMISSIONS.DELETE_USERS}
 *   fallback={<p>আপনার এই অনুমতি নেই</p>}
 * >
 *   <button>Delete</button>
 * </PermissionGate>
 * ```
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    logic = 'any',
    children,
    fallback = null,
    hideOnDenied = false,
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

    // If no permission specified, allow access
    if (!permission) {
        return <>{children}</>;
    }

    let hasAccess = false;

    // Check single permission
    if (typeof permission === 'string') {
        hasAccess = hasPermission(permission);
    }
    // Check multiple permissions
    else if (Array.isArray(permission)) {
        hasAccess = logic === 'all'
            ? hasAllPermissions(permission)
            : hasAnyPermission(permission);
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    // User doesn't have permission
    return hideOnDenied ? null : <>{fallback}</>;
};

interface RequirePermissionProps {
    permission: Permission | Permission[];
    logic?: 'any' | 'all';
    children: ReactNode;
}

/**
 * Stricter version of PermissionGate - only shows content if permission is granted
 * (no fallback option)
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
    permission,
    logic = 'any',
    children,
}) => {
    return (
        <PermissionGate permission={permission} logic={logic} hideOnDenied>
            {children}
        </PermissionGate>
    );
};
