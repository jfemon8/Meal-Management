import React, { ReactNode, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission, ROLE_LABELS, UserRole } from '../../config/permissions';

/**
 * Role-based UI Components
 * Utilities for conditionally rendering UI based on user roles and permissions
 */

// Role hierarchy (higher index = higher privilege)
const ROLE_HIERARCHY: UserRole[] = ['user', 'manager', 'admin', 'superadmin'];

/**
 * Get role level (0-based index in hierarchy)
 */
const getRoleLevel = (role: UserRole): number => {
    return ROLE_HIERARCHY.indexOf(role);
};

/**
 * Hook to check user role
 */
export const useRole = () => {
    const { user, isManager, isAdmin, isSuperAdmin } = useAuth();

    return useMemo(() => {
        const role = (user?.role || 'user') as UserRole;
        const roleLevel = getRoleLevel(role);

        return {
            role,
            roleLevel,
            roleLabel: ROLE_LABELS[role] || role,
            isUser: role === 'user',
            isManager,
            isAdmin,
            isSuperAdmin,
            /**
             * Check if user has at least the given role level
             */
            hasMinRole: (minRole: UserRole): boolean => {
                return roleLevel >= getRoleLevel(minRole);
            },
            /**
             * Check if user has exactly the given role
             */
            hasRole: (targetRole: UserRole): boolean => {
                return role === targetRole;
            },
            /**
             * Check if user has any of the given roles
             */
            hasAnyRole: (roles: UserRole[]): boolean => {
                return roles.includes(role);
            },
        };
    }, [user, isManager, isAdmin, isSuperAdmin]);
};

interface RoleGateProps {
    /**
     * Minimum role required (includes all higher roles)
     */
    minRole?: UserRole;
    /**
     * Specific role required
     */
    role?: UserRole;
    /**
     * Multiple roles allowed (any)
     */
    roles?: UserRole[];
    /**
     * Content to render if authorized
     */
    children: ReactNode;
    /**
     * Fallback if unauthorized
     */
    fallback?: ReactNode;
    /**
     * Hide completely if unauthorized
     */
    hideOnDenied?: boolean;
}

/**
 * Component to conditionally render based on role
 */
export const RoleGate: React.FC<RoleGateProps> = ({
    minRole,
    role,
    roles,
    children,
    fallback = null,
    hideOnDenied = false,
}) => {
    const { hasMinRole, hasRole, hasAnyRole } = useRole();

    let hasAccess = false;

    if (minRole) {
        hasAccess = hasMinRole(minRole);
    } else if (role) {
        hasAccess = hasRole(role);
    } else if (roles && roles.length > 0) {
        hasAccess = hasAnyRole(roles);
    } else {
        // No role requirement - allow access
        hasAccess = true;
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    return hideOnDenied ? null : <>{fallback}</>;
};

/**
 * Render different content based on role
 */
interface RoleSwitchProps {
    children: ReactNode;
}

interface RoleCaseProps {
    role: UserRole | UserRole[];
    minRole?: never;
    children: ReactNode;
}

interface MinRoleCaseProps {
    minRole: UserRole;
    role?: never;
    children: ReactNode;
}

interface DefaultCaseProps {
    default: true;
    children: ReactNode;
}

type CaseProps = RoleCaseProps | MinRoleCaseProps | DefaultCaseProps;

export const RoleSwitch: React.FC<RoleSwitchProps> = ({ children }) => {
    const { role: userRole, hasMinRole, hasAnyRole, hasRole: hasExactRole } = useRole();

    let matchedChild: ReactNode = null;
    let defaultChild: ReactNode = null;

    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;

        const props = child.props as CaseProps;

        if ('default' in props && props.default) {
            defaultChild = props.children;
            return;
        }

        if (matchedChild) return; // Already found a match

        if ('minRole' in props && props.minRole) {
            if (hasMinRole(props.minRole)) {
                matchedChild = props.children;
            }
        } else if ('role' in props && props.role) {
            const roles = Array.isArray(props.role) ? props.role : [props.role];
            if (hasAnyRole(roles)) {
                matchedChild = props.children;
            }
        }
    });

    return <>{matchedChild || defaultChild}</>;
};

export const RoleCase: React.FC<CaseProps> = ({ children }) => <>{children}</>;

/**
 * Show content only to specific role, hide from others
 */
export const OnlyFor: React.FC<{
    role?: UserRole | UserRole[];
    minRole?: UserRole;
    children: ReactNode;
}> = ({ role, minRole, children }) => {
    return (
        <RoleGate
            role={typeof role === 'string' ? role : undefined}
            roles={Array.isArray(role) ? role : undefined}
            minRole={minRole}
            hideOnDenied
        >
            {children}
        </RoleGate>
    );
};

// Shorthand components for common role checks
export const ManagerOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
    <OnlyFor minRole="manager">{children}</OnlyFor>
);

export const AdminOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
    <OnlyFor minRole="admin">{children}</OnlyFor>
);

export const SuperAdminOnly: React.FC<{ children: ReactNode }> = ({ children }) => (
    <OnlyFor role="superadmin">{children}</OnlyFor>
);

/**
 * Role badge component
 */
export const RoleBadge: React.FC<{
    role: UserRole;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}> = ({ role, size = 'md', className = '' }) => {
    const colors: Record<UserRole, string> = {
        user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        superadmin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };

    const sizes = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-0.5',
        lg: 'text-base px-3 py-1',
    };

    return (
        <span
            className={`
                inline-flex items-center rounded-full font-medium
                ${colors[role]}
                ${sizes[size]}
                ${className}
            `}
        >
            {ROLE_LABELS[role]}
        </span>
    );
};

/**
 * Combined permission and role check hook
 */
export const useAccessControl = () => {
    const roleUtils = useRole();
    const permissionUtils = usePermissions();

    return {
        ...roleUtils,
        ...permissionUtils,
        /**
         * Check both role and permission requirements
         */
        canAccess: (options: {
            minRole?: UserRole;
            role?: UserRole;
            permission?: Permission;
            permissions?: Permission[];
            permissionLogic?: 'any' | 'all';
        }): boolean => {
            const { minRole, role, permission, permissions, permissionLogic = 'any' } = options;

            // Check role
            let roleOk = true;
            if (minRole) {
                roleOk = roleUtils.hasMinRole(minRole);
            } else if (role) {
                roleOk = roleUtils.hasRole(role);
            }

            // Check permission
            let permissionOk = true;
            if (permission) {
                permissionOk = permissionUtils.hasPermission(permission);
            } else if (permissions && permissions.length > 0) {
                permissionOk = permissionLogic === 'all'
                    ? permissionUtils.hasAllPermissions(permissions)
                    : permissionUtils.hasAnyPermission(permissions);
            }

            // Both must pass
            return roleOk && permissionOk;
        },
    };
};

/**
 * Access control component combining role and permission checks
 */
interface AccessControlProps {
    minRole?: UserRole;
    role?: UserRole;
    permission?: Permission;
    permissions?: Permission[];
    permissionLogic?: 'any' | 'all';
    children: ReactNode;
    fallback?: ReactNode;
    hideOnDenied?: boolean;
}

export const AccessControl: React.FC<AccessControlProps> = ({
    minRole,
    role,
    permission,
    permissions,
    permissionLogic = 'any',
    children,
    fallback = null,
    hideOnDenied = false,
}) => {
    const { canAccess } = useAccessControl();

    const hasAccess = canAccess({
        minRole,
        role,
        permission,
        permissions,
        permissionLogic,
    });

    if (hasAccess) {
        return <>{children}</>;
    }

    return hideOnDenied ? null : <>{fallback}</>;
};

export default {
    useRole,
    useAccessControl,
    RoleGate,
    RoleSwitch,
    RoleCase,
    OnlyFor,
    ManagerOnly,
    AdminOnly,
    SuperAdminOnly,
    RoleBadge,
    AccessControl,
};
