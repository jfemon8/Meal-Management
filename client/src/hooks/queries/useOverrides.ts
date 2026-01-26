import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

// Types
interface MonthSettings {
    _id: string;
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    lunchRate: number;
    dinnerRate: number;
    isFinalized: boolean;
    createdBy: { _id: string; name: string };
    updatedAt: string;
}

interface Breakfast {
    _id: string;
    date: string;
    cost: number;
    items: string;
    submittedBy: { _id: string; name: string };
    isFinalized: boolean;
    updatedAt: string;
}

interface CorrectionHistory {
    _id: string;
    action: string;
    targetType: 'monthSettings' | 'breakfast' | 'transaction' | 'balance';
    targetId: string;
    previousValue: any;
    newValue: any;
    reason: string;
    performedBy: { _id: string; name: string; email: string };
    createdAt: string;
}

interface ForceUpdateMonthData {
    id: string;
    lunchRate?: number;
    dinnerRate?: number;
    startDate?: string;
    endDate?: string;
    reason: string;
}

interface ForceUpdateBreakfastData {
    id: string;
    cost?: number;
    items?: string;
    reason: string;
}

// Get finalized month settings for override
export const useFinalizedMonthSettings = () => {
    return useQuery({
        queryKey: ['finalizedMonthSettings'],
        queryFn: async () => {
            const { data } = await api.get('/month-settings?finalized=true');
            return data as MonthSettings[];
        }
    });
};

// Get finalized breakfast entries for override
export const useFinalizedBreakfasts = (startDate?: string, endDate?: string) => {
    return useQuery({
        queryKey: ['finalizedBreakfasts', startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('finalized', 'true');
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            const { data } = await api.get(`/breakfast?${params.toString()}`);
            return data as Breakfast[];
        }
    });
};

// Get correction history
export const useCorrectionHistory = (filters?: {
    targetType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}) => {
    return useQuery({
        queryKey: ['correctionHistory', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.targetType) params.append('targetType', filters.targetType);
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.limit) params.append('limit', String(filters.limit));
            const { data } = await api.get(`/super-admin/corrections/history?${params.toString()}`);
            return data as CorrectionHistory[];
        }
    });
};

// Force update finalized month settings
export const useForceUpdateMonthSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updateData }: ForceUpdateMonthData) => {
            const { data } = await api.put(`/super-admin/month-settings/${id}/force-update`, updateData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finalizedMonthSettings'] });
            queryClient.invalidateQueries({ queryKey: ['monthSettings'] });
            queryClient.invalidateQueries({ queryKey: ['correctionHistory'] });
        }
    });
};

// Force unfinalize month settings
export const useForceUnfinalizeMonth = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await api.put(`/super-admin/month-settings/${id}/force-unfinalize`, { reason });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finalizedMonthSettings'] });
            queryClient.invalidateQueries({ queryKey: ['monthSettings'] });
            queryClient.invalidateQueries({ queryKey: ['correctionHistory'] });
        }
    });
};

// Force update finalized breakfast
export const useForceUpdateBreakfast = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updateData }: ForceUpdateBreakfastData) => {
            const { data } = await api.put(`/super-admin/breakfast/${id}/force-update`, updateData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finalizedBreakfasts'] });
            queryClient.invalidateQueries({ queryKey: ['breakfast'] });
            queryClient.invalidateQueries({ queryKey: ['correctionHistory'] });
        }
    });
};

// Force unfinalize breakfast
export const useForceUnfinalizeBreakfast = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const { data } = await api.put(`/super-admin/breakfast/${id}/force-unfinalize`, { reason });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finalizedBreakfasts'] });
            queryClient.invalidateQueries({ queryKey: ['breakfast'] });
            queryClient.invalidateQueries({ queryKey: ['correctionHistory'] });
        }
    });
};
