import React, { createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../hooks/queries/useAuth';
import { useLogin as useLoginMutation, useRegister as useRegisterMutation, useLogout as useLogoutMutation } from '../hooks/mutations/useAuthMutations';
import { Permission } from '../config/permissions';

export interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
    permissions: Permission[];
    isActive: boolean;
    isGroupManager?: boolean;
    group?: string;
    balances: {
        breakfast: {
            amount: number;
            isFrozen: boolean;
            frozenAt?: string | null;
            frozenBy?: string | null;
            frozenReason?: string;
        };
        lunch: {
            amount: number;
            isFrozen: boolean;
            frozenAt?: string | null;
            frozenBy?: string | null;
            frozenReason?: string;
        };
        dinner: {
            amount: number;
            isFrozen: boolean;
            frozenAt?: string | null;
            frozenBy?: string | null;
            frozenReason?: string;
        };
    };
    balanceWarning?: {
        threshold: number;
        notified: boolean;
        lastNotifiedAt?: string | null;
    };
}

interface AuthContextType {
    user: User | null | undefined;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phone: string) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    hasRole: (requiredRole: string) => boolean;
    hasPermission: (permission: Permission) => boolean;
    hasAnyPermission: (permissions: Permission[]) => boolean;
    hasAllPermissions: (permissions: Permission[]) => boolean;
    isManager: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const queryClient = useQueryClient();
    const { data: user, isLoading } = useCurrentUser();
    const loginMutation = useLoginMutation();
    const registerMutation = useRegisterMutation();
    const logoutMutation = useLogoutMutation();

    const login = async (email: string, password: string) => {
        await loginMutation.mutateAsync({ email, password });
    };

    const register = async (name: string, email: string, password: string, phone: string) => {
        await registerMutation.mutateAsync({ name, email, password, phone });
    };

    const logout = () => {
        logoutMutation.mutate();
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            queryClient.setQueryData(['user'], { ...user, ...userData });
        }
    };

    // Check if user has required role (legacy method - kept for backward compatibility)
    const hasRole = (requiredRole: string): boolean => {
        if (!user) return false;

        const roleHierarchy: Record<string, number> = {
            'user': 1,
            'manager': 2,
            'admin': 3,
            'superadmin': 4
        };

        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    // Check if user has a specific permission
    const hasPermission = (permission: Permission): boolean => {
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    };

    // Check if user has any of the given permissions (OR logic)
    const hasAnyPermission = (permissions: Permission[]): boolean => {
        if (!user || !user.permissions) return false;
        return permissions.some(perm => user.permissions.includes(perm));
    };

    // Check if user has all of the given permissions (AND logic)
    const hasAllPermissions = (permissions: Permission[]): boolean => {
        if (!user || !user.permissions) return false;
        return permissions.every(perm => user.permissions.includes(perm));
    };

    const value: AuthContextType = {
        user,
        loading: isLoading,
        login,
        register,
        logout,
        updateUser,
        hasRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isManager: user ? ['manager', 'admin', 'superadmin'].includes(user.role) || user.isGroupManager === true : false,
        isAdmin: user ? ['admin', 'superadmin'].includes(user.role) : false,
        isSuperAdmin: user ? user.role === 'superadmin' : false
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
