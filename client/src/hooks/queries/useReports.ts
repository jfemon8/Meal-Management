import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

// Admin Dashboard Stats
interface RoleStats {
    users: number;
    managers: number;
    admins: number;
    superadmins: number;
    total: number;
}

interface UserStats {
    inactive: number;
    newThisMonth: number;
    frozenBalances: number;
}

interface BalanceStats {
    breakfast: number;
    lunch: number;
    dinner: number;
    total: number;
}

interface TransactionStat {
    amount: number;
    count: number;
}

interface TransactionSummary {
    deposits: TransactionStat;
    deductions: TransactionStat;
    adjustments: TransactionStat;
    refunds: TransactionStat;
}

interface SystemAlert {
    type: 'warning' | 'info';
    title: string;
    message: string;
    actionUrl: string;
    priority: 'high' | 'normal' | 'low';
}

export interface AdminDashboardData {
    roleStats: RoleStats;
    userStats: UserStats;
    balanceStats: BalanceStats;
    transactionSummary: TransactionSummary;
    systemAlerts: SystemAlert[];
    generatedAt: string;
}

export const useAdminDashboard = () => {
    return useQuery<AdminDashboardData>({
        queryKey: ['reports', 'admin-dashboard'],
        queryFn: async () => {
            const response = await api.get<AdminDashboardData>('/reports/admin-dashboard');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    });
};

// Manager Dashboard Stats
interface ManagerDashboardData {
    todayMeals: {
        lunch: { on: number; off: number; total: number };
        dinner: { on: number; off: number; total: number };
    };
    monthStats: {
        totalLunchMeals: number;
        totalDinnerMeals: number;
        totalBreakfastCost: number;
        lunchRate: number;
        dinnerRate: number;
    };
    recentDeposits: Array<{
        _id: string;
        user: { name: string };
        amount: number;
        balanceType: string;
        createdAt: string;
    }>;
    generatedAt: string;
}

export const useManagerDashboard = () => {
    return useQuery<ManagerDashboardData>({
        queryKey: ['reports', 'manager-dashboard'],
        queryFn: async () => {
            const response = await api.get<ManagerDashboardData>('/reports/manager-dashboard');
            return response.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};
