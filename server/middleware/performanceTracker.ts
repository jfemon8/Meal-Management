import { Request, Response, NextFunction } from 'express';
import PerformanceMetric from '../models/PerformanceMetric';
import { AuthRequest } from '../types';

// Middleware to track API performance
const trackApiPerformance = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override end function to capture response
    res.end = function(...args: any[]) {
        const responseTime = Date.now() - startTime;

        // Don't track health check or static files
        if (req.path === '/api/health' || req.path.startsWith('/static')) {
            return originalEnd.apply(res, args);
        }

        // Log performance metric asynchronously
        setImmediate(async () => {
            try {
                await PerformanceMetric.create({
                    type: 'api',
                    endpoint: req.route?.path || req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    responseTime,
                    userId: req.user?._id,
                    userAgent: req.get('user-agent'),
                    ip: req.ip || (req as any).connection.remoteAddress
                });
            } catch (error: any) {
                console.error('Failed to log performance metric:', error.message);
            }
        });

        return originalEnd.apply(res, args);
    } as any;

    next();
};

// Function to collect system metrics
const collectSystemMetrics = async (): Promise<void> => {
    const os = require('os');

    try {
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length; // Normalize by CPU count
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        await PerformanceMetric.create({
            type: 'system',
            cpuUsage: Math.round(cpuUsage * 100) / 100,
            memoryUsage: {
                total: totalMemory,
                used: usedMemory,
                free: freeMemory,
                percentage: Math.round((usedMemory / totalMemory) * 10000) / 100
            },
            uptime: os.uptime()
        });
    } catch (error: any) {
        console.error('Failed to collect system metrics:', error.message);
    }
};

// Start system metrics collection (every 5 minutes)
let systemMetricsInterval: ReturnType<typeof setInterval> | null = null;

const startSystemMetricsCollection = (): void => {
    if (!systemMetricsInterval) {
        // Collect immediately
        collectSystemMetrics();
        // Then collect every 5 minutes
        systemMetricsInterval = setInterval(collectSystemMetrics, 5 * 60 * 1000);
    }
};

const stopSystemMetricsCollection = (): void => {
    if (systemMetricsInterval) {
        clearInterval(systemMetricsInterval);
        systemMetricsInterval = null;
    }
};

export {
    trackApiPerformance,
    collectSystemMetrics,
    startSystemMetricsCollection,
    stopSystemMetricsCollection
};
