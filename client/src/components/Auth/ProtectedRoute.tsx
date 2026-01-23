import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Permission } from '../../config/permissions';

interface ProtectedRouteProps {
    children: ReactNode;

    /**
     * Required role (legacy - use permissions instead)
     * @deprecated Use requiredPermissions instead
     */
    requiredRole?: 'user' | 'manager' | 'admin' | 'superadmin';

    /**
     * Required permission(s) to access this route
     */
    requiredPermissions?: Permission | Permission[];

    /**
     * Logic for checking multiple permissions
     * - 'any': User needs at least one permission (default)
     * - 'all': User needs all permissions
     */
    permissionLogic?: 'any' | 'all';

    /**
     * Redirect path if unauthorized
     */
    redirectTo?: string;
}

/**
 * Protected Route Component with Permission-based Access Control
 *
 * @example
 * ```tsx
 * // Role-based (legacy)
 * <ProtectedRoute requiredRole="manager">
 *   <ManagerDashboard />
 * </ProtectedRoute>
 *
 * // Permission-based (single permission)
 * <ProtectedRoute requiredPermissions={PERMISSIONS.MANAGE_USERS}>
 *   <UserManagement />
 * </ProtectedRoute>
 *
 * // Permission-based (multiple permissions - ANY)
 * <ProtectedRoute
 *   requiredPermissions={[PERMISSIONS.VIEW_ALL_USERS, PERMISSIONS.MANAGE_USERS]}
 *   permissionLogic="any"
 * >
 *   <UserList />
 * </ProtectedRoute>
 *
 * // Permission-based (multiple permissions - ALL)
 * <ProtectedRoute
 *   requiredPermissions={[PERMISSIONS.MANAGE_USERS, PERMISSIONS.DELETE_USERS]}
 *   permissionLogic="all"
 * >
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
    requiredPermissions,
    permissionLogic = 'any',
    redirectTo = '/login',
}) => {
    const {
        user,
        loading,
        hasRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions
    } = useAuth();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">যাচাই করা হচ্ছে...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    // Check permission-based access (new approach)
    if (requiredPermissions) {
        let hasAccess = false;

        if (typeof requiredPermissions === 'string') {
            // Single permission
            hasAccess = hasPermission(requiredPermissions);
        } else if (Array.isArray(requiredPermissions)) {
            // Multiple permissions
            hasAccess = permissionLogic === 'all'
                ? hasAllPermissions(requiredPermissions)
                : hasAnyPermission(requiredPermissions);
        }

        if (!hasAccess) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="text-center max-w-md mx-auto p-6">
                        <div className="mb-6">
                            <svg
                                className="w-24 h-24 mx-auto text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
                            অনুমোদন নেই
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            এই পেজে প্রবেশের অনুমতি আপনার নেই।
                        </p>
                        <button
                            onClick={() => window.history.back()}
                            className="btn-primary"
                        >
                            ফিরে যান
                        </button>
                    </div>
                </div>
            );
        }
    }
    // Fall back to role-based access (legacy support)
    else if (requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center max-w-md mx-auto p-6">
                    <div className="mb-6">
                        <svg
                            className="w-24 h-24 mx-auto text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
                        অনুমোদন নেই
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        এই পেজে প্রবেশের অনুমতি আপনার নেই।
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="btn-primary"
                    >
                        ফিরে যান
                    </button>
                </div>
            </div>
        );
    }

    // User has access
    return <>{children}</>;
};

export default ProtectedRoute;
