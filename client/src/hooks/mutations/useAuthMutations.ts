import { useMutation, useQueryClient } from '@tanstack/react-query';
import api, { setAuthToken } from '../../services/api';
import toast from 'react-hot-toast';

interface LoginData {
    email: string;
    password: string;
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone?: string;
}

interface AuthResponse {
    token: string;
    _id: string;
    name: string;
    email: string;
    role: string;
    balances: {
        breakfast: number;
        lunch: number;
        dinner: number;
    };
}

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: LoginData) => {
            const response = await api.post<AuthResponse>('/auth/login', data);
            return response.data;
        },
        onSuccess: (data) => {
            const { token, ...userData } = data;
            setAuthToken(token);
            queryClient.setQueryData(['user'], userData);
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'লগইন ব্যর্থ হয়েছে');
        }
    });
};

export const useRegister = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: RegisterData) => {
            const response = await api.post<AuthResponse>('/auth/register', data);
            return response.data;
        },
        onSuccess: (data) => {
            const { token, ...userData } = data;
            setAuthToken(token);
            queryClient.setQueryData(['user'], userData);
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
        }
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            setAuthToken(null);
        },
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
            queryClient.clear();
        }
    });
};
