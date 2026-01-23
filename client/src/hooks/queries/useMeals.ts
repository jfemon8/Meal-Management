import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface MealStatus {
    date: string;
    isOn: boolean;
    count: number;
    mealType: 'lunch' | 'dinner';
    userId: string;
}

interface MealSummary {
    totalMeals: number;
    totalDaysOn: number;
    lunchRate: number;
    dinnerRate: number;
    totalCharge: number;
    month: number;
    year: number;
}

interface DailyMeal {
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    date: string;
    lunch: {
        isOn: boolean;
        count: number;
    };
    dinner: {
        isOn: boolean;
        count: number;
    };
}

export const useMealStatus = (startDate: string, endDate: string, userId?: string | null) => {
    return useQuery<MealStatus[]>({
        queryKey: ['meals', 'status', startDate, endDate, userId],
        queryFn: async () => {
            const params: any = { startDate, endDate };
            if (userId) params.userId = userId;
            const response = await api.get<MealStatus[]>('/meals/status', { params });
            return response.data;
        },
        enabled: !!startDate && !!endDate,
    });
};

export const useMealSummary = (year: number, month: number, userId?: string | null) => {
    return useQuery<MealSummary>({
        queryKey: ['meals', 'summary', year, month, userId],
        queryFn: async () => {
            const params: any = { year, month };
            if (userId) params.userId = userId;
            const response = await api.get<MealSummary>('/meals/summary', { params });
            return response.data;
        },
        enabled: !!year && !!month,
    });
};

export const useDailyMeals = (date: string) => {
    return useQuery<DailyMeal[]>({
        queryKey: ['meals', 'daily', date],
        queryFn: async () => {
            const response = await api.get<DailyMeal[]>('/meals/daily', { params: { date } });
            return response.data;
        },
        enabled: !!date,
    });
};
