import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface User {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: 'user' | 'manager' | 'admin' | 'superadmin';
    balances: {
        breakfast: number;
        lunch: number;
        dinner: number;
    };
    isActive: boolean;
    createdAt: string;
}

export const useAllUsers = () => {
    return useQuery<User[]>({
        queryKey: ['users', 'all'],
        queryFn: async () => {
            const response = await api.get<User[]>('/users');
            return response.data;
        },
    });
};

export const useUser = (id: string) => {
    return useQuery<User>({
        queryKey: ['users', id],
        queryFn: async () => {
            const response = await api.get<User>(`/users/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
};
