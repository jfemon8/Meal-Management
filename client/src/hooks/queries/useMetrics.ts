import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

// Types
interface ApiEndpointMetric {
    endpoint: string;
    method: string;
    avgResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    errorRate: number;
}

interface SystemMetric {
    _id: string;
    type: string;
    cpuUsage: number;
    memoryUsage: {
        total: number;
        used: number;
        free: number;
        percentage: number;
    };
    uptime: number;
    timestamp: string;
}

interface CurrentSystemStats {
    cpu: {
        usage: number;
        cores: number;
        model: string;
        loadAvg: number[];
    };
    memory: {
        total: number;
        used: number;
        free: number;
        percentage: number;
        totalFormatted: string;
        usedFormatted: string;
        freeFormatted: string;
    };
    system: {
        platform: string;
        arch: string;
        hostname: string;
        uptime: number;
        uptimeFormatted: string;
        nodeVersion: string;
    };
    database: {
        name: string;
        collections: number;
        objects: number;
        dataSize: number;
        dataSizeFormatted: string;
        storageSize: number;
        storageSizeFormatted: string;
        indexes: number;
        indexSize: number;
        indexSizeFormatted: string;
    };
    process: {
        pid: number;
        uptime: number;
        uptimeFormatted: string;
        memoryUsage: Record<string, number>;
    };
    generatedAt: string;
}

interface ErrorSummary {
    bySeverity: {
        critical: number;
        error: number;
        warning: number;
        info: number;
    };
    bySource: Record<string, number>;
    recentErrors: ErrorLog[];
    unresolvedCount: number;
    totalErrors: number;
}

interface ErrorLog {
    _id: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    message: string;
    stack?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userId?: {
        _id: string;
        name: string;
        email: string;
    };
    userName?: string;
    isResolved: boolean;
    occurrenceCount: number;
    createdAt: string;
}

interface ErrorTrend {
    _id: string;
    errors: Array<{ severity: string; count: number }>;
    total: number;
}

interface DashboardMetrics {
    currentSystem: {
        cpuUsage: number;
        memoryPercentage: number;
        memoryUsed: string;
        memoryTotal: string;
        uptime: string;
    };
    apiPerformance: {
        endpoints: ApiEndpointMetric[];
        slowEndpoints: ApiEndpointMetric[];
        totalRequests: number;
        avgResponseTime: number;
    };
    errors: ErrorSummary & {
        trends: ErrorTrend[];
    };
    systemHistory: SystemMetric[];
    generatedAt: string;
}

// Hooks
export const useMetricsDashboard = () => {
    return useQuery<DashboardMetrics>({
        queryKey: ['metrics', 'dashboard'],
        queryFn: async () => {
            const response = await api.get<DashboardMetrics>('/metrics/dashboard');
            return response.data;
        },
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 60 * 1000, // Refresh every minute
    });
};

export const useCurrentSystemStats = () => {
    return useQuery<CurrentSystemStats>({
        queryKey: ['metrics', 'system', 'current'],
        queryFn: async () => {
            const response = await api.get<CurrentSystemStats>('/metrics/system/current');
            return response.data;
        },
        staleTime: 10 * 1000, // 10 seconds
        refetchInterval: 30 * 1000, // Refresh every 30 seconds
    });
};

export const useApiPerformanceSummary = (hours: number = 24) => {
    return useQuery({
        queryKey: ['metrics', 'performance', 'summary', hours],
        queryFn: async () => {
            const response = await api.get(`/metrics/performance/summary?hours=${hours}`);
            return response.data;
        },
        staleTime: 60 * 1000,
    });
};

export const useSlowEndpoints = (threshold: number = 1000, hours: number = 24) => {
    return useQuery({
        queryKey: ['metrics', 'performance', 'slow', threshold, hours],
        queryFn: async () => {
            const response = await api.get(`/metrics/performance/slow?threshold=${threshold}&hours=${hours}`);
            return response.data;
        },
        staleTime: 60 * 1000,
    });
};

export const useSystemMetricsHistory = (hours: number = 24, limit: number = 100) => {
    return useQuery({
        queryKey: ['metrics', 'system', 'history', hours, limit],
        queryFn: async () => {
            const response = await api.get(`/metrics/system?hours=${hours}&limit=${limit}`);
            return response.data;
        },
        staleTime: 60 * 1000,
    });
};

export const useErrorSummary = (hours: number = 24) => {
    return useQuery<{ period: string } & ErrorSummary>({
        queryKey: ['metrics', 'errors', 'summary', hours],
        queryFn: async () => {
            const response = await api.get(`/metrics/errors/summary?hours=${hours}`);
            return response.data;
        },
        staleTime: 30 * 1000,
    });
};

export const useErrorTrends = (days: number = 7) => {
    return useQuery({
        queryKey: ['metrics', 'errors', 'trends', days],
        queryFn: async () => {
            const response = await api.get(`/metrics/errors/trends?days=${days}`);
            return response.data;
        },
        staleTime: 60 * 1000,
    });
};

interface ErrorListParams {
    page?: number;
    limit?: number;
    severity?: string;
    source?: string;
    isResolved?: boolean;
    search?: string;
}

export const useErrorLogs = (params: ErrorListParams = {}) => {
    return useQuery({
        queryKey: ['metrics', 'errors', 'list', params],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page.toString());
            if (params.limit) queryParams.append('limit', params.limit.toString());
            if (params.severity) queryParams.append('severity', params.severity);
            if (params.source) queryParams.append('source', params.source);
            if (params.isResolved !== undefined) queryParams.append('isResolved', params.isResolved.toString());
            if (params.search) queryParams.append('search', params.search);

            const response = await api.get(`/metrics/errors?${queryParams.toString()}`);
            return response.data;
        },
        staleTime: 30 * 1000,
    });
};

export const useResolveError = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, resolution }: { id: string; resolution?: string }) => {
            const response = await api.put(`/metrics/errors/${id}/resolve`, { resolution });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metrics', 'errors'] });
        },
    });
};

export const useDeleteOldErrors = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (days: number = 30) => {
            const response = await api.delete(`/metrics/errors/old?days=${days}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metrics', 'errors'] });
        },
    });
};

export const useDeleteOldMetrics = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (days: number = 7) => {
            const response = await api.delete(`/metrics/performance/old?days=${days}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metrics', 'performance'] });
        },
    });
};
