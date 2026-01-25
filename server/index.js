const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import cron jobs
const { initHolidayCron } = require('./jobs/holidayCron');
const { initNotificationCron } = require('./jobs/notificationCron');

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-management')
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        // Initialize cron jobs after DB connection
        if (process.env.NODE_ENV !== 'test') {
            initHolidayCron();
            initNotificationCron();
        }
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/breakfast', require('./routes/breakfast'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/month-settings', require('./routes/monthSettings'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/rule-overrides', require('./routes/ruleOverrides'));
app.use('/api/global-settings', require('./routes/globalSettings'));
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/feature-flags', require('./routes/featureFlags'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/backup', require('./routes/backup'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Meal Management System API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});


