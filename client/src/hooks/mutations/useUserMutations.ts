import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface UpdateUserData {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
}

interface UpdateBalanceData {
    id: string;
    amount: number;
    balanceType: 'breakfast' | 'lunch' | 'dinner';
    type: 'deposit' | 'deduction' | 'adjustment' | 'refund';
    description?: string;
}

interface UpdateRoleData {
    id: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
}

interface UpdateStatusData {
    id: string;
    isActive: boolean;
}

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateUserData) => {
            const { id, ...updateData } = data;
            const response = await api.put(`/users/${id}`, updateData);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
            toast.success('প্রোফাইল আপডেট সফল হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে');
        }
    });
};

export const useUpdateBalance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateBalanceData) => {
            const { id, ...balanceData } = data;
            const response = await api.put(`/users/${id}/balance`, balanceData);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            toast.success('ব্যালেন্স আপডেট সফল হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'ব্যালেন্স আপডেট ব্যর্থ হয়েছে');
        }
    });
};

export const useUpdateUserRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateRoleData) => {
            const { id, role } = data;
            const response = await api.put(`/users/${id}/role`, { role });
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
            toast.success('রোল আপডেট সফল হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'রোল আপডেট ব্যর্থ হয়েছে');
        }
    });
};

export const useUpdateUserStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateStatusData) => {
            const { id, isActive } = data;
            const response = await api.put(`/users/${id}/status`, { isActive });
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
            toast.success('স্ট্যাটাস আপডেট সফল হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে');
        }
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('ইউজার ডিলিট সফল হয়েছে');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'ইউজার ডিলিট ব্যর্থ হয়েছে');
        }
    });
};
