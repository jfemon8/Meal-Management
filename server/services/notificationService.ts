import Notification from '../models/Notification';
import User from '../models/User';
import GlobalSettings from '../models/GlobalSettings';
import { sendLowBalanceEmail, sendMonthClosingEmail, sendHolidayUpdateEmail } from '../utils/emailService';
import { Types } from 'mongoose';
import { BalanceType, TransactionType, INotificationDocument, IUserDocument, IHolidayDocument } from '../types';

/**
 * Send low balance warning notification
 */
const sendLowBalanceWarning = async (userId: Types.ObjectId | string, balanceType: BalanceType, currentBalance: number, threshold: number): Promise<any | null> => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        const balanceNames: Record<string, string> = {
            breakfast: 'ব্রেকফাস্ট',
            lunch: 'লাঞ্চ',
            dinner: 'ডিনার'
        };

        const notification: any = await (Notification as any).createNotification(
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
            } catch (emailError: any) {
                console.error('Email send error:', emailError);
            }
        }

        return notification;
    } catch (error: any) {
        console.error('sendLowBalanceWarning error:', error);
        return null;
    }
};

/**
 * Check and send low balance warnings for a user
 */
const checkLowBalance = async (userId: Types.ObjectId | string): Promise<any[]> => {
    try {
        const settings = await GlobalSettings.getSettings();
        const threshold: number = settings.notifications?.lowBalanceWarning?.threshold || 500;

        const user = await User.findById(userId);
        if (!user || !user.isActive) return [];

        const warnings: any[] = [];

        // Check each balance type
        for (const balanceType of ['breakfast', 'lunch', 'dinner'] as BalanceType[]) {
            const balance: number = user.balances[balanceType].amount;

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
    } catch (error: any) {
        console.error('checkLowBalance error:', error);
        return [];
    }
};

/**
 * Send balance update notification
 */
const sendBalanceUpdateNotification = async (userId: Types.ObjectId | string, type: TransactionType, amount: number, balanceType: BalanceType, newBalance: number, description: string = ''): Promise<any | null> => {
    try {
        const balanceNames: Record<string, string> = {
            breakfast: 'ব্রেকফাস্ট',
            lunch: 'লাঞ্চ',
            dinner: 'ডিনার'
        };

        const typeNames: Record<string, string> = {
            deposit: 'জমা',
            deduction: 'কর্তন',
            adjustment: 'সংশোধন',
            refund: 'ফেরত'
        };

        const title: string = type === 'deposit' ? 'ব্যালেন্স জমা হয়েছে' : 'ব্যালেন্স কর্তন হয়েছে';
        const message: string = `${balanceNames[balanceType]} অ্যাকাউন্টে ${Math.abs(amount)} টাকা ${typeNames[type]} হয়েছে। বর্তমান ব্যালেন্স: ${newBalance} টাকা। ${description}`;

        const notification: any = await (Notification as any).createNotification(
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
    } catch (error: any) {
        console.error('sendBalanceUpdateNotification error:', error);
        return null;
    }
};

/**
 * Send month closing reminder
 */
const sendMonthClosingReminder = async (year: number, month: number, daysRemaining: number): Promise<any[]> => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id email name');

        const notifications: any = await (Notification as any).createBulkNotification(
            users.map((u: any) => u._id),
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
            } catch (emailError: any) {
                console.error('Email send error for user:', user.email, emailError);
            }
        }

        return notifications;
    } catch (error: any) {
        console.error('sendMonthClosingReminder error:', error);
        return [];
    }
};

/**
 * Send month finalized notification
 */
const sendMonthFinalizedNotification = async (year: number, month: number, adminId: Types.ObjectId | string): Promise<any[]> => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        const notifications: any = await (Notification as any).createBulkNotification(
            users.map((u: any) => u._id),
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
    } catch (error: any) {
        console.error('sendMonthFinalizedNotification error:', error);
        return [];
    }
};

/**
 * Send holiday notification
 */
const sendHolidayNotification = async (action: string, holiday: any, adminId: Types.ObjectId | string): Promise<any[]> => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id email name');

        const actionTexts: Record<string, string> = {
            added: 'নতুন ছুটি যোগ হয়েছে',
            updated: 'ছুটির তথ্য আপডেট হয়েছে',
            removed: 'ছুটি বাতিল হয়েছে'
        };

        const typeText: string = actionTexts[action] || 'ছুটির তথ্য পরিবর্তন হয়েছে';
        const date: string = new Date(holiday.date).toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const notifications: any = await (Notification as any).createBulkNotification(
            users.map((u: any) => u._id),
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
            } catch (emailError: any) {
                console.error('Email send error for user:', user.email, emailError);
            }
        }

        return notifications;
    } catch (error: any) {
        console.error('sendHolidayNotification error:', error);
        return [];
    }
};

/**
 * Send meal reminder notification
 */
const sendMealReminder = async (): Promise<any[]> => {
    try {
        const settings = await GlobalSettings.getSettings();
        if (!settings.notifications?.dailyReminder?.enabled) return [];

        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        const today: string = new Date().toLocaleDateString('bn-BD', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const notifications: any = await (Notification as any).createBulkNotification(
            users.map((u: any) => u._id),
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
    } catch (error: any) {
        console.error('sendMealReminder error:', error);
        return [];
    }
};

/**
 * Send role changed notification
 */
const sendRoleChangedNotification = async (userId: Types.ObjectId | string, newRole: string, adminId: Types.ObjectId | string): Promise<any | null> => {
    try {
        const roleNames: Record<string, string> = {
            user: 'ইউজার',
            manager: 'ম্যানেজার',
            admin: 'এডমিন',
            superadmin: 'সুপার এডমিন'
        };

        const notification: any = await (Notification as any).createNotification(
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
    } catch (error: any) {
        console.error('sendRoleChangedNotification error:', error);
        return null;
    }
};

interface AnnouncementOptions {
    priority?: string;
    actionUrl?: string;
    actionText?: string;
}

/**
 * Send system announcement
 */
const sendSystemAnnouncement = async (title: string, message: string, adminId: Types.ObjectId | string, options: AnnouncementOptions = {}): Promise<any[]> => {
    try {
        const users = await User.find({ isActive: true, isDeleted: { $ne: true } }).select('_id');

        const notifications: any = await (Notification as any).createBulkNotification(
            users.map((u: any) => u._id),
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
    } catch (error: any) {
        console.error('sendSystemAnnouncement error:', error);
        return [];
    }
};

export {
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
