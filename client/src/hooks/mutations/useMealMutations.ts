import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ToggleMealData {
    date: string;
    isOn: boolean;
    userId?: string | null;
    count?: number;
}

interface UpdateMealCountData {
    date: string;
    userId: string;
    count: number;
    notes?: string;
}

export const useToggleMeal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: ToggleMealData) => {
            const payload: any = {
                date: data.date,
                isOn: data.isOn,
                count: data.count || 1
            };
            if (data.userId) payload.userId = data.userId;

            const response = await api.put('/meals/toggle', payload);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            toast.success(variables.isOn ? 'মিল চালু করা হয়েছে' : 'মিল বন্ধ করা হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'মিল আপডেট ব্যর্থ হয়েছে');
        }
    });
};

export const useUpdateMealCount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateMealCountData) => {
            const response = await api.put('/meals/count', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meals'] });
            toast.success('মিল সংখ্যা আপডেট করা হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'মিল সংখ্যা আপডেট ব্যর্থ হয়েছে');
        }
    });
};
