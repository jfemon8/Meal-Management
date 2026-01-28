import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import cron jobs
import { initHolidayCron } from './jobs/holidayCron';
import { initNotificationCron } from './jobs/notificationCron';

// Import performance and error tracking
import { trackApiPerformance, startSystemMetricsCollection } from './middleware/performanceTracker';
import { errorLogger } from './middleware/errorLogger';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import groupsRoutes from './routes/groups';
import mealsRoutes from './routes/meals';
import breakfastRoutes from './routes/breakfast';
import transactionsRoutes from './routes/transactions';
import monthSettingsRoutes from './routes/monthSettings';
import holidaysRoutes from './routes/holidays';
import reportsRoutes from './routes/reports';
import walletRoutes from './routes/wallet';
import ruleOverridesRoutes from './routes/ruleOverrides';
import globalSettingsRoutes from './routes/globalSettings';
import superAdminRoutes from './routes/superAdmin';
import featureFlagsRoutes from './routes/featureFlags';
import notificationsRoutes from './routes/notifications';
import auditLogsRoutes from './routes/auditLogs';
import backupRoutes from './routes/backup';
import metricsRoutes from './routes/metrics';
import groupReportsRoutes from './routes/groupReports';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Performance tracking middleware
app.use(trackApiPerformance);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-management')
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        // Initialize cron jobs after DB connection
        if (process.env.NODE_ENV !== 'test') {
            initHolidayCron();
            initNotificationCron();
            // Start system metrics collection
            startSystemMetricsCollection();
        }
    })
    .catch((err: Error) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/breakfast', breakfastRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/month-settings', monthSettingsRoutes);
app.use('/api/holidays', holidaysRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rule-overrides', ruleOverridesRoutes);
app.use('/api/global-settings', globalSettingsRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/feature-flags', featureFlagsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/group-reports', groupReportsRoutes);

// Error logging middleware (before error handler)
app.use(errorLogger);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'Meal Management System API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
