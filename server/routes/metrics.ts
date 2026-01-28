import express, { Response } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import PerformanceMetric from '../models/PerformanceMetric';
import ErrorLog from '../models/ErrorLog';
import { protect, isSuperAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = express.Router();

// @route   GET /api/metrics/performance/summary
// @desc    Get API performance summary
// @access  Private (SuperAdmin)
router.get('/performance/summary', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const hours = parseInt(req.query.hours as string) || 24;
        const summary = await (PerformanceMetric as any).getApiSummary(hours);

        res.json({
            period: `${hours} hours`,
            endpoints: summary,
            totalEndpoints: summary.length,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/performance/slow
// @desc    Get slow endpoints
// @access  Private (SuperAdmin)
router.get('/performance/slow', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const threshold = parseInt(req.query.threshold as string) || 1000;
        const hours = parseInt(req.query.hours as string) || 24;
        const slowEndpoints = await (PerformanceMetric as any).getSlowEndpoints(threshold, hours);

        res.json({
            threshold: `${threshold}ms`,
            period: `${hours} hours`,
            endpoints: slowEndpoints,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/system
// @desc    Get system metrics history
// @access  Private (SuperAdmin)
router.get('/system', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const hours = parseInt(req.query.hours as string) || 24;
        const limit = parseInt(req.query.limit as string) || 100;
        const metrics = await (PerformanceMetric as any).getSystemMetrics(hours, limit);

        res.json({
            period: `${hours} hours`,
            metrics,
            count: metrics.length,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/system/current
// @desc    Get current system stats
// @access  Private (SuperAdmin)
router.get('/system/current', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        // Get MongoDB stats
        const dbStats = await mongoose.connection.db!.stats();

        res.json({
            cpu: {
                usage: Math.round(cpuUsage * 100) / 100,
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || 'Unknown',
                loadAvg: os.loadavg()
            },
            memory: {
                total: totalMemory,
                used: usedMemory,
                free: freeMemory,
                percentage: Math.round((usedMemory / totalMemory) * 10000) / 100,
                totalFormatted: formatBytes(totalMemory),
                usedFormatted: formatBytes(usedMemory),
                freeFormatted: formatBytes(freeMemory)
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: os.uptime(),
                uptimeFormatted: formatUptime(os.uptime()),
                nodeVersion: process.version
            },
            database: {
                name: dbStats.db,
                collections: dbStats.collections,
                objects: dbStats.objects,
                dataSize: dbStats.dataSize,
                dataSizeFormatted: formatBytes(dbStats.dataSize),
                storageSize: dbStats.storageSize,
                storageSizeFormatted: formatBytes(dbStats.storageSize),
                indexes: dbStats.indexes,
                indexSize: dbStats.indexSize,
                indexSizeFormatted: formatBytes(dbStats.indexSize)
            },
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                uptimeFormatted: formatUptime(process.uptime()),
                memoryUsage: process.memoryUsage()
            },
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/errors/summary
// @desc    Get error summary
// @access  Private (SuperAdmin)
router.get('/errors/summary', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const hours = parseInt(req.query.hours as string) || 24;
        const summary = await (ErrorLog as any).getSummary(hours);

        res.json({
            period: `${hours} hours`,
            ...summary,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/errors/trends
// @desc    Get error trends
// @access  Private (SuperAdmin)
router.get('/errors/trends', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const trends = await (ErrorLog as any).getTrends(days);

        res.json({
            period: `${days} days`,
            trends,
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/errors
// @desc    Get error logs with pagination
// @access  Private (SuperAdmin)
router.get('/errors', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const filter: any = {};

        if (req.query.severity) {
            filter.severity = req.query.severity;
        }
        if (req.query.source) {
            filter.source = req.query.source;
        }
        if (req.query.isResolved !== undefined) {
            filter.isResolved = req.query.isResolved === 'true';
        }
        if (req.query.search) {
            filter.message = { $regex: req.query.search, $options: 'i' };
        }

        const [errors, total] = await Promise.all([
            ErrorLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email')
                .lean(),
            ErrorLog.countDocuments(filter)
        ]);

        res.json({
            errors,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/metrics/errors/:id/resolve
// @desc    Mark error as resolved
// @access  Private (SuperAdmin)
router.put('/errors/:id/resolve', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { resolution } = req.body;

        const error = await ErrorLog.findByIdAndUpdate(
            req.params.id,
            {
                isResolved: true,
                resolvedAt: new Date(),
                resolvedBy: req.user!._id,
                resolution
            },
            { new: true }
        );

        if (!error) {
            return res.status(404).json({ message: 'এরর লগ পাওয়া যায়নি' });
        }

        res.json({
            message: 'এরর রিজলভ করা হয়েছে',
            error
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/metrics/errors/old
// @desc    Delete old error logs
// @access  Private (SuperAdmin)
router.delete('/errors/old', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await ErrorLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        res.json({
            message: `${result.deletedCount} টি পুরাতন এরর লগ মুছে ফেলা হয়েছে`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/metrics/performance/old
// @desc    Delete old performance metrics
// @access  Private (SuperAdmin)
router.delete('/performance/old', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await PerformanceMetric.deleteMany({
            timestamp: { $lt: cutoffDate }
        });

        res.json({
            message: `${result.deletedCount} টি পুরাতন মেট্রিক্স মুছে ফেলা হয়েছে`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/metrics/dashboard
// @desc    Get all dashboard metrics
// @access  Private (SuperAdmin)
router.get('/dashboard', protect, isSuperAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const [
            apiSummary,
            slowEndpoints,
            systemMetrics,
            errorSummary,
            errorTrends
        ] = await Promise.all([
            (PerformanceMetric as any).getApiSummary(24),
            (PerformanceMetric as any).getSlowEndpoints(1000, 24),
            (PerformanceMetric as any).getSystemMetrics(24, 50),
            (ErrorLog as any).getSummary(24),
            (ErrorLog as any).getTrends(7)
        ]);

        // Get current system stats
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;

        res.json({
            currentSystem: {
                cpuUsage: Math.round(cpuUsage * 100) / 100,
                memoryPercentage: Math.round((usedMemory / totalMemory) * 10000) / 100,
                memoryUsed: formatBytes(usedMemory),
                memoryTotal: formatBytes(totalMemory),
                uptime: formatUptime(os.uptime())
            },
            apiPerformance: {
                endpoints: apiSummary.slice(0, 10),
                slowEndpoints: slowEndpoints.slice(0, 5),
                totalRequests: apiSummary.reduce((sum: number, e: any) => sum + e.totalRequests, 0),
                avgResponseTime: apiSummary.length > 0
                    ? Math.round(apiSummary.reduce((sum: number, e: any) => sum + e.avgResponseTime, 0) / apiSummary.length)
                    : 0
            },
            errors: {
                ...errorSummary,
                trends: errorTrends
            },
            systemHistory: systemMetrics.slice(0, 20),
            generatedAt: new Date()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// Helper functions
function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '0m';
}

export default router;
