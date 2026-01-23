import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface MonthSettings {
    _id: string;
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    lunchRate: number;
    dinnerRate: number;
    isFinalized: boolean;
    createdAt: string;
    updatedAt: string;
}

export const useMonthSettings = (year?: number, month?: number) => {
    return useQuery<MonthSettings | null>({
        queryKey: ['month-settings', year, month],
        queryFn: async () => {
            const params: any = {};
            if (year && month) {
                params.year = year;
                params.month = month;
            }
            const response = await api.get<MonthSettings>('/month-settings', { params });
            return response.data;
        },
        enabled: !!(year && month),
    });
};

export const useCurrentMonthSettings = () => {
    return useQuery<MonthSettings | null>({
        queryKey: ['month-settings', 'current'],
        queryFn: async () => {
            const response = await api.get<MonthSettings>('/month-settings/current');
            return response.data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
        retry: 1,
    });
};
