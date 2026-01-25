import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export interface GlobalSettings {
    _id: string;
    type: string;
    defaultRates: {
        lunch: number;
        dinner: number;
    };
    defaultMealStatus: {
        lunch: boolean;
        dinner: boolean;
    };
    cutoffTimes: {
        lunch: number;
        dinner: number;
    };
    weekendPolicy: {
        fridayOff: boolean;
        saturdayOff: boolean;
        oddSaturdayOff: boolean;
        evenSaturdayOff: boolean;
    };
    holidayPolicy: {
        governmentHolidayOff: boolean;
        optionalHolidayOff: boolean;
        religiousHolidayOff: boolean;
    };
    notifications: {
        dailyReminder: {
            enabled: boolean;
            time: number;
        };
        lowBalanceWarning: {
            enabled: boolean;
            threshold: number;
        };
    };
    registration: {
        allowRegistration: boolean;
        defaultRole: 'user' | 'manager';
        requireEmailVerification: boolean;
    };
    updatedAt: string;
    modifiedBy?: string;
}

export const useGlobalSettings = () => {
    return useQuery<GlobalSettings>({
        queryKey: ['global-settings'],
        queryFn: async () => {
            const response = await api.get<GlobalSettings>('/global-settings');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useUpdateGlobalSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates: Partial<GlobalSettings>) => {
            const response = await api.put('/global-settings', updates);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};

export const useUpdateDefaultRates = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (rates: { lunch?: number; dinner?: number }) => {
            const response = await api.put('/global-settings/default-rates', rates);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};

export const useUpdateCutoffTimes = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (times: { lunch?: number; dinner?: number }) => {
            const response = await api.put('/global-settings/cutoff-times', times);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};

export const useUpdateWeekendPolicy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (policy: Partial<GlobalSettings['weekendPolicy']>) => {
            const response = await api.put('/global-settings/weekend-policy', policy);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};

export const useUpdateHolidayPolicy = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (policy: Partial<GlobalSettings['holidayPolicy']>) => {
            const response = await api.put('/global-settings/holiday-policy', policy);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};

export const useUpdateRegistrationSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (settings: Partial<GlobalSettings['registration']>) => {
            const response = await api.put('/global-settings/registration', settings);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};

export const useResetGlobalSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.post('/global-settings/reset');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-settings'] });
        },
    });
};
