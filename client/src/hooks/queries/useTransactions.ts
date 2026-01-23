import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface Transaction {
    _id: string;
    user: {
        _id: string;
        name: string;
        email: string;
    };
    type: 'deposit' | 'deduction' | 'adjustment' | 'refund';
    balanceType: 'breakfast' | 'lunch' | 'dinner';
    amount: number;
    previousBalance: number;
    newBalance: number;
    description: string;
    reference?: string;
    referenceModel?: string;
    createdAt: string;
}

interface TransactionParams {
    balanceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
}

export const useTransactions = (params: TransactionParams = {}) => {
    return useQuery<Transaction[]>({
        queryKey: ['transactions', params],
        queryFn: async () => {
            const response = await api.get<Transaction[]>('/transactions', { params });
            return response.data;
        },
    });
};

export const useUserTransactions = (userId: string, params: TransactionParams = {}) => {
    return useQuery<Transaction[]>({
        queryKey: ['transactions', 'user', userId, params],
        queryFn: async () => {
            const response = await api.get<Transaction[]>(`/transactions/user/${userId}`, { params });
            return response.data;
        },
        enabled: !!userId,
    });
};

export const useAllTransactions = (params: TransactionParams = {}) => {
    return useQuery<Transaction[]>({
        queryKey: ['transactions', 'all', params],
        queryFn: async () => {
            const response = await api.get<Transaction[]>('/transactions/all', { params });
            return response.data;
        },
    });
};
