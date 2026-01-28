import cron from 'node-cron';
import MonthSettings from '../models/MonthSettings';
import GlobalSettings from '../models/GlobalSettings';
import {
    sendMonthClosingReminder,
    sendMealReminder,
    checkLowBalance
} from '../services/notificationService';
import User from '../models/User';

/**
 * Check month closing and send reminders
 * Runs daily at 9 AM
 */
const checkMonthClosing = async (): Promise<void> => {
    try {
        console.log('🔔 Running month closing check...');

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;

        // Get current month settings
        const monthSettings = await MonthSettings.findOne({
            year: currentYear,
            month: currentMonth,
            isFinalized: false
        });

        if (!monthSettings) {
            console.log('No active month settings found');
            return;
        }

        const endDate = new Date(monthSettings.endDate);
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminder at 7 days, 3 days, and 1 day before month end
        if ([7, 3, 1].includes(daysRemaining)) {
            console.log(`📧 Sending month closing reminder - ${daysRemaining} days remaining`);
            await sendMonthClosingReminder(currentYear, currentMonth, daysRemaining);
        }
    } catch (error) {
        console.error('Month closing check error:', error);
    }
};

/**
 * Send daily meal reminder
 * Runs daily at configured time (default 8 AM)
 */
const sendDailyMealReminder = async (): Promise<void> => {
    try {
        const settings = await GlobalSettings.getSettings();

        if (!settings.notifications?.dailyReminder?.enabled) {
            return;
        }

        console.log('🔔 Sending daily meal reminder...');
        await sendMealReminder();
    } catch (error) {
        console.error('Daily meal reminder error:', error);
    }
};

/**
 * Check low balances for all users
 * Runs daily at 10 AM
 */
const checkAllUsersLowBalance = async (): Promise<void> => {
    try {
        console.log('🔔 Checking low balances for all users...');

        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        for (const user of users) {
            await checkLowBalance(user._id);
        }

        console.log(`✅ Checked low balance for ${users.length} users`);
    } catch (error) {
        console.error('Low balance check error:', error);
    }
};

/**
 * Initialize notification cron jobs
 */
const initNotificationCron = (): void => {
    console.log('📅 Initializing notification cron jobs...');

    // Month closing check - daily at 9 AM
    cron.schedule('0 9 * * *', () => {
        checkMonthClosing();
    }, {
        timezone: 'Asia/Dhaka'
    });

    // Daily meal reminder - daily at 8 AM
    cron.schedule('0 8 * * *', () => {
        sendDailyMealReminder();
    }, {
        timezone: 'Asia/Dhaka'
    });

    // Low balance check - daily at 10 AM
    cron.schedule('0 10 * * *', () => {
        checkAllUsersLowBalance();
    }, {
        timezone: 'Asia/Dhaka'
    });

    console.log('✅ Notification cron jobs initialized');
};

export {
    initNotificationCron,
    checkMonthClosing,
    sendDailyMealReminder,
    checkAllUsersLowBalance
};
