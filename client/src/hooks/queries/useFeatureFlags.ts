import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

interface FeatureFlag {
    _id: string;
    key: string;
    name: string;
    description: string;
    isEnabled: boolean;
    category: 'meal' | 'transaction' | 'user' | 'report' | 'notification' | 'system' | 'experimental';
    allowedRoles: string[];
    allowedUsers: Array<{ _id: string; name: string; email: string }>;
    rolloutPercentage: number;
    environments: {
        development: boolean;
        staging: boolean;
        production: boolean;
    };
    startDate: string | null;
    endDate: string | null;
    dependencies: string[];
    config: Record<string, any>;
    createdBy: { _id: string; name: string; email: string };
    updatedBy?: { _id: string; name: string; email: string };
    history: Array<{
        action: string;
        changedBy: { _id: string; name: string; email: string };
        changedAt: string;
        previousValue: any;
        newValue: any;
        reason: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

interface CreateFeatureFlagData {
    key: string;
    name: string;
    description?: string;
    category?: string;
    isEnabled?: boolean;
    allowedRoles?: string[];
    rolloutPercentage?: number;
    environments?: {
        development?: boolean;
        staging?: boolean;
        production?: boolean;
    };
    startDate?: string;
    endDate?: string;
    dependencies?: string[];
    config?: Record<string, any>;
}

interface UpdateFeatureFlagData {
    name?: string;
    description?: string;
    category?: string;
    allowedRoles?: string[];
    allowedUsers?: string[];
    rolloutPercentage?: number;
    environments?: {
        development?: boolean;
        staging?: boolean;
        production?: boolean;
    };
    startDate?: string | null;
    endDate?: string | null;
    dependencies?: string[];
    config?: Record<string, any>;
    reason?: string;
}

// Get all feature flags
export const useFeatureFlags = (filters?: { category?: string; enabled?: boolean }) => {
    return useQuery({
        queryKey: ['featureFlags', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.category) params.append('category', filters.category);
            if (filters?.enabled !== undefined) params.append('enabled', String(filters.enabled));

            const { data } = await api.get(`/feature-flags?${params.toString()}`);
            return data as FeatureFlag[];
        }
    });
};

// Get single feature flag
export const useFeatureFlag = (id: string) => {
    return useQuery({
        queryKey: ['featureFlag', id],
        queryFn: async () => {
            const { data } = await api.get(`/feature-flags/${id}`);
            return data as FeatureFlag;
        },
        enabled: !!id
    });
};

// Get active features for current user
export const useActiveFeatures = () => {
    return useQuery({
        queryKey: ['activeFeatures'],
        queryFn: async () => {
            const { data } = await api.get('/feature-flags/active');
            return data as Record<string, { name: string; config: Record<string, any> }>;
        }
    });
};

// Check if a specific feature is enabled
export const useCheckFeature = (key: string) => {
    return useQuery({
        queryKey: ['checkFeature', key],
        queryFn: async () => {
            const { data } = await api.get(`/feature-flags/check/${key}`);
            return data as { key: string; isEnabled: boolean };
        },
        enabled: !!key
    });
};

// Get categories
export const useFeatureFlagCategories = () => {
    return useQuery({
        queryKey: ['featureFlagCategories'],
        queryFn: async () => {
            const { data } = await api.get('/feature-flags/categories/list');
            return data as Array<{ key: string; name: string }>;
        }
    });
};

// Create feature flag
export const useCreateFeatureFlag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (flagData: CreateFeatureFlagData) => {
            const { data } = await api.post('/feature-flags', flagData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
        }
    });
};

// Update feature flag
export const useUpdateFeatureFlag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...flagData }: UpdateFeatureFlagData & { id: string }) => {
            const { data } = await api.put(`/feature-flags/${id}`, flagData);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
            queryClient.invalidateQueries({ queryKey: ['featureFlag', variables.id] });
        }
    });
};

// Toggle feature flag
export const useToggleFeatureFlag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
            const { data } = await api.put(`/feature-flags/${id}/toggle`, { reason });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
            queryClient.invalidateQueries({ queryKey: ['featureFlag', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['activeFeatures'] });
        }
    });
};

// Update feature config
export const useUpdateFeatureFlagConfig = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, config, reason }: { id: string; config: Record<string, any>; reason?: string }) => {
            const { data } = await api.put(`/feature-flags/${id}/config`, { config, reason });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
            queryClient.invalidateQueries({ queryKey: ['featureFlag', variables.id] });
        }
    });
};

// Manage beta users
export const useManageBetaUsers = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, action, userIds }: { id: string; action: 'add' | 'remove'; userIds: string[] }) => {
            const { data } = await api.put(`/feature-flags/${id}/beta-users`, { action, userIds });
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
            queryClient.invalidateQueries({ queryKey: ['featureFlag', variables.id] });
        }
    });
};

// Delete feature flag
export const useDeleteFeatureFlag = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.delete(`/feature-flags/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['featureFlags'] });
        }
    });
};
