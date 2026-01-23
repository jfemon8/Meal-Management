const Notification = require('../models/Notification');
const User = require('../models/User');
const GlobalSettings = require('../models/GlobalSettings');
const { sendLowBalanceEmail, sendMonthClosingEmail, sendHolidayUpdateEmail } = require('../utils/emailService');

/**
 * Send low balance warning notification
 */
const sendLowBalanceWarning = async (userId, balanceType, currentBalance, threshold) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const balanceNames = {
            breakfast: 'ব্রেকফাস্ট',
            lunch: 'লাঞ্চ',
            dinner: 'ডিনার'
        };

        const notification = await Notification.createNotification(
            userId,
            'low_balance',
            'কম ব্যালেন্স সতর্কতা',
            `আপনার ${balanceNames[balanceType]} ব্যালেন্স ${currentBalance} টাকা, যা ${threshold} টাকার নিচে। অনুগ্রহ করে ব্যালেন্স রিচার্জ করুন।`,
            {
                priority: 'high',
                category: 'balance',
                data: { balanceType, currentBalance, threshold },
                actionUrl: '/wallet',
                actionText: 'ব্যালেন্স রিচার্জ করুন'
            }
        );

        // Send email if enabled
        const settings = await GlobalSettings.getSettings();
        if (settings.notifications?.lowBalanceWarning?.enabled) {
            try {
                await sendLowBalanceEmail(user.email, user.name, balanceType, currentBalance, threshold);
                notification.emailSent = true;
                notification.emailSentAt = new Date();
                await notification.save();
            } catch (emailError) {
                console.error('Email send error:', emailError);
            }
        }

        return notification;
    } catch (error) {
        console.error('sendLowBalanceWarning error:', error);
        return null;
    }
};

/**
 * Check and send low balance warnings for a user
 */
const checkLowBalance = async (userId) => {
    try {
        const settings = await GlobalSettings.getSettings();
        const threshold = settings.notifications?.lowBalanceWarning?.threshold || 500;

        const user = await User.findById(userId);
        if (!user || !user.isActive) return;

        const warnings = [];

        // Check each balance type
        for (const balanceType of ['breakfast', 'lunch', 'dinner']) {
            const balance = user.balances[balanceType].amount;

            if (balance < threshold) {
                // Check if we already sent a warning recently (within 24 hours)
                const recentWarning = await Notification.findOne({
                    user: userId,
                    type: 'low_balance',
                    'data.balanceType': balanceType,
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                });

                if (!recentWarning) {
                    const warning = await sendLowBalanceWarning(userId, balanceType, balance, threshold);
                    if (warning) warnings.push(warning);
                }
            }
        }

        return warnings;
    } catch (error) {
        console.error('checkLowBalance error:', error);
        return [];
    }
};

/**
 * Send balance update notification
 */
const sendBalanceUpdateNotification = async (userId, type, amount, balanceType, newBalance, description = '') => {
    try {
        const balanceNames = {
            breakfast: 'ব্রেকফাস্ট',
            lunch: 'লাঞ্চ',
            dinner: 'ডিনার'
        };

        const typeNames = {
            deposit: 'জমা',
            deduction: 'কর্তন',
            adjustment: 'সংশোধন',
            refund: 'ফেরত'
        };

        const title = type === 'deposit' ? 'ব্যালেন্স জমা হয়েছে' : 'ব্যালেন্স কর্তন হয়েছে';
        const message = `${balanceNames[balanceType]} অ্যাকাউন্টে ${Math.abs(amount)} টাকা ${typeNames[type]} হয়েছে। বর্তমান ব্যালেন্স: ${newBalance} টাকা। ${description}`;

        const notification = await Notification.createNotification(
            userId,
            type === 'deposit' ? 'balance_deposit' : 'balance_deduction',
            title,
            message,
            {
                priority: type === 'deduction' ? 'normal' : 'low',
                category: 'balance',
                data: { type, amount, balanceType, newBalance }
            }
        );

        // Check low balance after deduction
        if (type === 'deduction') {
            await checkLowBalance(userId);
        }

        return notification;
    } catch (error) {
        console.error('sendBalanceUpdateNotification error:', error);
        return null;
    }
};

/**
 * Send month closing reminder
 */
const sendMonthClosingReminder = async (year, month, daysRemaining) => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id email name');

        const notifications = await Notification.createBulkNotification(
            users.map(u => u._id),
            'month_closing',
            'মাস শেষের রিমাইন্ডার',
            `${year} সালের ${month} মাস ${daysRemaining} দিনের মধ্যে শেষ হবে। আপনার মিল স্ট্যাটাস চেক করুন এবং প্রয়োজনে ব্যালেন্স রিচার্জ করুন।`,
            {
                priority: 'high',
                category: 'system',
                data: { year, month, daysRemaining },
                actionUrl: '/meals',
                actionText: 'মিল দেখুন'
            }
        );

        // Send emails
        for (const user of users) {
            try {
                await sendMonthClosingEmail(user.email, user.name, year, month, daysRemaining);
            } catch (emailError) {
                console.error('Email send error for user:', user.email, emailError);
            }
        }

        return notifications;
    } catch (error) {
        console.error('sendMonthClosingReminder error:', error);
        return [];
    }
};

/**
 * Send month finalized notification
 */
const sendMonthFinalizedNotification = async (year, month, adminId) => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        const notifications = await Notification.createBulkNotification(
            users.map(u => u._id),
            'month_finalized',
            'মাস ফাইনালাইজ হয়েছে',
            `${year} সালের ${month} মাসের হিসাব ফাইনালাইজ হয়েছে। আপনার রিপোর্ট দেখতে পারেন।`,
            {
                priority: 'normal',
                category: 'system',
                data: { year, month },
                actionUrl: `/reports?year=${year}&month=${month}`,
                actionText: 'রিপোর্ট দেখুন',
                createdBy: adminId
            }
        );

        return notifications;
    } catch (error) {
        console.error('sendMonthFinalizedNotification error:', error);
        return [];
    }
};

/**
 * Send holiday notification
 */
const sendHolidayNotification = async (action, holiday, adminId) => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id email name');

        const actionTexts = {
            added: 'নতুন ছুটি যোগ হয়েছে',
            updated: 'ছুটির তথ্য আপডেট হয়েছে',
            removed: 'ছুটি বাতিল হয়েছে'
        };

        const typeText = actionTexts[action] || 'ছুটির তথ্য পরিবর্তন হয়েছে';
        const date = new Date(holiday.date).toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const notifications = await Notification.createBulkNotification(
            users.map(u => u._id),
            action === 'added' ? 'holiday_added' : action === 'updated' ? 'holiday_updated' : 'holiday_removed',
            typeText,
            `${date} তারিখে ${holiday.nameBn || holiday.name}। ${action === 'removed' ? 'এই দিন এখন কর্মদিবস।' : 'এই দিন মিল বন্ধ থাকবে।'}`,
            {
                priority: 'normal',
                category: 'holiday',
                data: { holidayId: holiday._id, date: holiday.date, name: holiday.nameBn || holiday.name, action },
                createdBy: adminId
            }
        );

        // Send emails
        for (const user of users) {
            try {
                await sendHolidayUpdateEmail(user.email, user.name, action, holiday);
            } catch (emailError) {
                console.error('Email send error for user:', user.email, emailError);
            }
        }

        return notifications;
    } catch (error) {
        console.error('sendHolidayNotification error:', error);
        return [];
    }
};

/**
 * Send meal reminder notification
 */
const sendMealReminder = async () => {
    try {
        const settings = await GlobalSettings.getSettings();
        if (!settings.notifications?.dailyReminder?.enabled) return [];

        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        const today = new Date().toLocaleDateString('bn-BD', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const notifications = await Notification.createBulkNotification(
            users.map(u => u._id),
            'meal_reminder',
            'আজকের মিল রিমাইন্ডার',
            `আজ ${today}। আপনার মিল স্ট্যাটাস চেক করতে ভুলবেন না।`,
            {
                priority: 'low',
                category: 'meal',
                actionUrl: '/meals',
                actionText: 'মিল দেখুন',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire after 24 hours
            }
        );

        return notifications;
    } catch (error) {
        console.error('sendMealReminder error:', error);
        return [];
    }
};

/**
 * Send role changed notification
 */
const sendRoleChangedNotification = async (userId, newRole, adminId) => {
    try {
        const roleNames = {
            user: 'ইউজার',
            manager: 'ম্যানেজার',
            admin: 'এডমিন',
            superadmin: 'সুপার এডমিন'
        };

        const notification = await Notification.createNotification(
            userId,
            'role_changed',
            'রোল পরিবর্তন হয়েছে',
            `আপনার রোল ${roleNames[newRole]} এ পরিবর্তন করা হয়েছে।`,
            {
                priority: 'high',
                category: 'account',
                data: { newRole },
                createdBy: adminId
            }
        );

        return notification;
    } catch (error) {
        console.error('sendRoleChangedNotification error:', error);
        return null;
    }
};

/**
 * Send system announcement
 */
const sendSystemAnnouncement = async (title, message, adminId, options = {}) => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        const notifications = await Notification.createBulkNotification(
            users.map(u => u._id),
            'system_announcement',
            title,
            message,
            {
                priority: options.priority || 'normal',
                category: 'system',
                actionUrl: options.actionUrl,
                actionText: options.actionText,
                createdBy: adminId
            }
        );

        return notifications;
    } catch (error) {
        console.error('sendSystemAnnouncement error:', error);
        return [];
    }
};

module.exports = {
    sendLowBalanceWarning,
    checkLowBalance,
    sendBalanceUpdateNotification,
    sendMonthClosingReminder,
    sendMonthFinalizedNotification,
    sendHolidayNotification,
    sendMealReminder,
    sendRoleChangedNotification,
    sendSystemAnnouncement
};
