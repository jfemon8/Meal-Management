import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

// Types
interface MaintenanceConfig {
    isEnabled: boolean;
    message: string;
    messageEn: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    allowedRoles: string[];
    allowedUsers: string[];
    enabledBy?: { _id: string; name: string };
    enabledAt?: string;
    reason?: string;
}

interface RateRule {
    name: string;
    description?: string;
    isActive: boolean;
    priority: number;
    conditionType: 'day_of_week' | 'date_range' | 'holiday' | 'user_count' | 'special_event';
    conditionParams: {
        days?: number[];
        startDate?: string;
        endDate?: string;
        minUsers?: number;
        maxUsers?: number;
        holidayTypes?: string[];
        eventName?: string;
    };
    adjustment: {
        type: 'fixed' | 'percentage' | 'multiplier';
        value: number;
        applyTo: 'lunch' | 'dinner' | 'both';
    };
    validFrom?: string;
    validUntil?: string;
    createdBy?: { _id: string; name: string };
    createdAt?: string;
}

// ==================== Maintenance Mode ====================

// Get maintenance status
export const useMaintenanceStatus = () => {
    return useQuery({
        queryKey: ['maintenanceStatus'],
        queryFn: async () => {
            const { data } = await api.get('/super-admin/maintenance');
            return data as { maintenance: MaintenanceConfig; isActive: boolean };
        }
    });
};

// Enable maintenance mode
export const useEnableMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (config: {
            message?: string;
            messageEn?: string;
            scheduledStart?: string;
            scheduledEnd?: string;
            allowedRoles?: string[];
            allowedUsers?: string[];
            reason?: string;
        }) => {
            const { data } = await api.put('/super-admin/maintenance/enable', config);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenanceStatus'] });
        }
    });
};

// Disable maintenance mode
export const useDisableMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await api.put('/super-admin/maintenance/disable');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenanceStatus'] });
        }
    });
};

// Schedule maintenance
export const useScheduleMaintenance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (config: {
            scheduledStart: string;
            scheduledEnd: string;
            message?: string;
            messageEn?: string;
            allowedRoles?: string[];
            reason?: string;
        }) => {
            const { data } = await api.put('/super-admin/maintenance/schedule', config);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenanceStatus'] });
        }
    });
};

// ==================== Rate Rules ====================

// Get rate rules
export const useRateRules = () => {
    return useQuery({
        queryKey: ['rateRules'],
        queryFn: async () => {
            const { data } = await api.get('/super-admin/rate-rules');
            return data as { enabled: boolean; rules: RateRule[] };
        }
    });
};

// Toggle rate rules system
export const useToggleRateRules = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data } = await api.put('/super-admin/rate-rules/toggle');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rateRules'] });
        }
    });
};

// Add rate rule
export const useAddRateRule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (rule: Omit<RateRule, 'createdBy' | 'createdAt'>) => {
            const { data } = await api.post('/super-admin/rate-rules', rule);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rateRules'] });
        }
    });
};

// Update rate rule
export const useUpdateRateRule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ index, ...rule }: Partial<RateRule> & { index: number }) => {
            const { data } = await api.put(`/super-admin/rate-rules/${index}`, rule);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rateRules'] });
        }
    });
};

// Delete rate rule
export const useDeleteRateRule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (index: number) => {
            const { data } = await api.delete(`/super-admin/rate-rules/${index}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rateRules'] });
        }
    });
};

// Test rate calculation
export const useTestRateCalculation = () => {
    return useMutation({
        mutationFn: async (params: { date?: string; mealType?: 'lunch' | 'dinner'; userCount?: number }) => {
            const { data } = await api.post('/super-admin/rate-rules/calculate', params);
            return data;
        }
    });
};

// ==================== Public Maintenance Check ====================

// Get maintenance status (public - for frontend banner)
export const usePublicMaintenanceStatus = () => {
    return useQuery({
        queryKey: ['publicMaintenanceStatus'],
        queryFn: async () => {
            try {
                const { data } = await api.get('/maintenance/status');
                return data;
            } catch (error) {
                return { isActive: false };
            }
        },
        refetchInterval: 60000, // Check every minute
        retry: false
    });
};
