import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

// Types
interface DataSummary {
    meals: {
        total: number;
        active: number;
        lunch: number;
        dinner: number;
    };
    holidays: {
        total: number;
        recurring: number;
        byType: {
            government: number;
            optional: number;
            religious: number;
        };
    };
    groups: {
        total: number;
        active: number;
    };
    transactions: {
        total: number;
        corrected: number;
    };
    users: {
        total: number;
        deleted: number;
    };
}

interface RecalculateResult {
    current: number;
    calculated: number;
    difference: number;
    transactionCount: number;
}

// Get data summary for control panel
export const useDataSummary = () => {
    return useQuery({
        queryKey: ['dataSummary'],
        queryFn: async () => {
            const { data } = await api.get('/super-admin/data-summary');
            return data as DataSummary;
        }
    });
};

// Force edit meal
export const useForceEditMeal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...editData }: {
            id: string;
            isOn?: boolean;
            count?: number;
            mealType?: string;
            reason: string;
        }) => {
            const { data } = await api.put(`/super-admin/meals/${id}/force-edit`, editData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Force delete meal
export const useForceDeleteMeal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await api.delete(`/super-admin/meals/${id}/force-delete`, { data: { reason } });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Force edit holiday
export const useForceEditHoliday = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...editData }: {
            id: string;
            name?: string;
            nameEn?: string;
            date?: string;
            type?: string;
            isRecurring?: boolean;
            description?: string;
            reason: string;
        }) => {
            const { data } = await api.put(`/super-admin/holidays/${id}/force-edit`, editData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Force delete holiday
export const useForceDeleteHoliday = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await api.delete(`/super-admin/holidays/${id}/force-delete`, { data: { reason } });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Force edit group
export const useForceEditGroup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...editData }: {
            id: string;
            name?: string;
            description?: string;
            manager?: string;
            members?: string[];
            isActive?: boolean;
            reason: string;
        }) => {
            const { data } = await api.put(`/super-admin/groups/${id}/force-edit`, editData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Recalculate user balance
export const useRecalculateUserBalance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, dryRun = true, balanceType }: {
            userId: string;
            dryRun?: boolean;
            balanceType?: 'breakfast' | 'lunch' | 'dinner';
        }) => {
            const { data } = await api.post(`/super-admin/users/${userId}/recalculate-balance`, {
                dryRun,
                balanceType
            });
            return data as {
                message: string;
                dryRun: boolean;
                user: { id: string; name: string };
                results: Record<string, RecalculateResult>;
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });
};

// Recalculate all balances
export const useRecalculateAllBalances = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ dryRun = true }: { dryRun?: boolean }) => {
            const { data } = await api.post('/super-admin/db/recalculate-all-balances', { dryRun });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });
};

// Recalculate meal costs
export const useRecalculateMealCosts = () => {
    return useMutation({
        mutationFn: async ({ year, month, dryRun = true, reason }: {
            year: number;
            month: number;
            dryRun?: boolean;
            reason?: string;
        }) => {
            const { data } = await api.post('/super-admin/recalculate-meal-costs', {
                year,
                month,
                dryRun,
                reason
            });
            return data;
        }
    });
};

// System reset
export const useSystemReset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ resetType, reason }: {
            resetType: 'test_data' | 'all_meals' | 'all_transactions' | 'reset_balances';
            reason: string;
        }) => {
            const { data } = await api.post('/super-admin/system-reset', {
                resetType,
                confirmReset: 'I_UNDERSTAND_THIS_IS_DESTRUCTIVE',
                reason
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
        }
    });
};

// Soft delete user
export const useSoftDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
            const { data } = await api.put(`/super-admin/users/${userId}/soft-delete`, { reason });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['deletedUsers'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Restore user
export const useRestoreUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const { data } = await api.put(`/super-admin/users/${userId}/restore`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['deletedUsers'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Get deleted users
export const useDeletedUsers = () => {
    return useQuery({
        queryKey: ['deletedUsers'],
        queryFn: async () => {
            const { data } = await api.get('/super-admin/users/deleted');
            return data;
        }
    });
};

// Permanent delete user
export const usePermanentDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const { data } = await api.delete(`/super-admin/users/${userId}/permanent`, {
                data: { confirmDelete: 'PERMANENTLY_DELETE' }
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['deletedUsers'] });
            queryClient.invalidateQueries({ queryKey: ['dataSummary'] });
        }
    });
};

// Database stats
export const useDbStats = () => {
    return useQuery({
        queryKey: ['dbStats'],
        queryFn: async () => {
            const { data } = await api.get('/super-admin/db/stats');
            return data;
        }
    });
};

// Cleanup orphans
export const useCleanupOrphans = () => {
    return useMutation({
        mutationFn: async ({ dryRun = true }: { dryRun?: boolean }) => {
            const { data } = await api.post('/super-admin/db/cleanup-orphans', { dryRun });
            return data;
        }
    });
};
