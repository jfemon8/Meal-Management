import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Permission } from '../../config/permissions';

interface BalanceInfo {
    amount: number;
    isFrozen: boolean;
    frozenAt?: string | null;
    frozenBy?: string | null;
    frozenReason?: string;
}

interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
    permissions: Permission[];
    balances: {
        breakfast: BalanceInfo;
        lunch: BalanceInfo;
        dinner: BalanceInfo;
    };
    balanceWarning?: {
        threshold: number;
        notified: boolean;
        lastNotifiedAt?: string | null;
    };
    isActive: boolean;
    createdAt: string;
}

export const useCurrentUser = () => {
    return useQuery<User | null>({
        queryKey: ['user'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                return null;
            }
            try {
                const response = await api.get<User>('/auth/me');
                return response.data;
            } catch (error) {
                localStorage.removeItem('token');
                return null;
            }
        },
        retry: false,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useAuth = () => {
    const { data: user, isLoading: loading } = useCurrentUser();

    const hasRole = (requiredRole: 'user' | 'manager' | 'admin' | 'superadmin') => {
        if (!user) return false;

        const roleHierarchy: Record<string, number> = {
            'user': 1,
            'manager': 2,
            'admin': 3,
            'superadmin': 4
        };

        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    return {
        user,
        loading,
        hasRole,
        isManager: user && ['manager', 'admin', 'superadmin'].includes(user.role),
        isAdmin: user && ['admin', 'superadmin'].includes(user.role),
        isSuperAdmin: user && user.role === 'superadmin'
    };
};
