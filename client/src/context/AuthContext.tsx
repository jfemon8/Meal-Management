import React, { createContext, useContext, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../hooks/queries/useAuth';
import { useLogin as useLoginMutation, useRegister as useRegisterMutation, useLogout as useLogoutMutation } from '../hooks/mutations/useAuthMutations';

interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
    isActive: boolean;
    balances: {
        breakfast: number;
        lunch: number;
        dinner: number;
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

    // Check if user has required role
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

    const value: AuthContextType = {
        user,
        loading: isLoading,
        login,
        register,
        logout,
        updateUser,
        hasRole,
        isManager: user ? ['manager', 'admin', 'superadmin'].includes(user.role) : false,
        isAdmin: user ? ['admin', 'superadmin'].includes(user.role) : false,
        isSuperAdmin: user ? user.role === 'superadmin' : false
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
