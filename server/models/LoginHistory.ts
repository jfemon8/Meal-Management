import mongoose from 'mongoose';
import { ILoginHistoryDocument } from '../types';

const loginHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Login attempt details
    status: {
        type: String,
        enum: ['success', 'failed', 'blocked', 'suspicious'],
        required: true,
        index: true
    },
    loginMethod: {
        type: String,
        enum: ['password', 'otp_email', 'otp_phone', 'phone', '2fa', 'refresh_token'],
        required: true
    },
    // Device information
    deviceInfo: {
        userAgent: String,
        platform: String, // Windows, Mac, Linux, Android, iOS
        browser: String, // Chrome, Firefox, Safari, etc.
        browserVersion: String,
        os: String, // OS name and version
        device: String, // Desktop, Mobile, Tablet
        ip: String,
        deviceId: String, // Unique device identifier (fingerprint)
    },
    // Location information (can be derived from IP)
    location: {
        country: String,
        city: String,
        region: String,
        timezone: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    // Authentication details
    email: String, // Email used for login
    phone: String, // Phone used for login
    // Failure details (if failed)
    failureReason: {
        type: String,
        enum: [
            'invalid_credentials',
            'account_inactive',
            'account_locked',
            'invalid_otp',
            'otp_expired',
            'too_many_attempts',
            'invalid_token',
            'suspicious_activity',
            'other'
        ]
    },
    failureMessage: String,
    attemptCount: {
        type: Number,
        default: 1
    },
    // Session information (if successful)
    sessionId: String,
    tokenFamily: String, // Reference to refresh token family
    // Security flags
    isSuspicious: {
        type: Boolean,
        default: false
    },
    suspiciousReasons: [String], // e.g., ['new_device', 'new_location', 'unusual_time']
    // Timestamps
    loginAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    logoutAt: Date,
    sessionDuration: Number, // in seconds
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
loginHistorySchema.index({ user: 1, loginAt: -1 });
loginHistorySchema.index({ user: 1, status: 1, loginAt: -1 });
loginHistorySchema.index({ 'deviceInfo.ip': 1, loginAt: -1 });
loginHistorySchema.index({ 'deviceInfo.deviceId': 1 });

// Method to mark session as ended
loginHistorySchema.methods.endSession = function() {
    this.logoutAt = new Date();
    this.sessionDuration = Math.floor((this.logoutAt - this.loginAt) / 1000);
    return this.save();
};

// Static method to get recent login attempts for a user
loginHistorySchema.statics.getRecentAttempts = async function(userId: mongoose.Types.ObjectId | string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({
        user: userId,
        loginAt: { $gte: since }
    }).sort({ loginAt: -1 });
};

// Static method to get failed attempts count
loginHistorySchema.statics.getFailedAttemptsCount = async function(userId: mongoose.Types.ObjectId | string, minutes: number = 15): Promise<number> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.countDocuments({
        user: userId,
        status: 'failed',
        loginAt: { $gte: since }
    });
};

// Static method to check for suspicious activity
loginHistorySchema.statics.checkSuspiciousActivity = async function(userId: mongoose.Types.ObjectId | string, deviceInfo: Record<string, any>) {
    const recentLogins = await this.find({
        user: userId,
        status: 'success'
    }).sort({ loginAt: -1 }).limit(10);

    const suspiciousReasons: string[] = [];

    // Check for new device
    const knownDeviceIds = recentLogins.map((login: any) => login.deviceInfo?.deviceId).filter(Boolean);
    if (deviceInfo.deviceId && !knownDeviceIds.includes(deviceInfo.deviceId)) {
        suspiciousReasons.push('new_device');
    }

    // Check for new IP
    const knownIPs = recentLogins.map((login: any) => login.deviceInfo?.ip).filter(Boolean);
    if (deviceInfo.ip && !knownIPs.includes(deviceInfo.ip)) {
        suspiciousReasons.push('new_ip');
    }

    // Check for unusual time (e.g., 2 AM - 5 AM)
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
        suspiciousReasons.push('unusual_time');
    }

    return {
        isSuspicious: suspiciousReasons.length > 0,
        reasons: suspiciousReasons
    };
};

// Static method to get active sessions for a user
loginHistorySchema.statics.getActiveSessions = async function(userId: mongoose.Types.ObjectId | string) {
    return this.find({
        user: userId,
        status: 'success',
        logoutAt: { $exists: false }
    }).sort({ loginAt: -1 });
};

// Static method to get login statistics
loginHistorySchema.statics.getLoginStats = async function(userId: mongoose.Types.ObjectId | string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId as string),
                loginAt: { $gte: since }
            }
        },
        {
            $group: {
                _id: null,
                totalAttempts: { $sum: 1 },
                successfulLogins: {
                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
                },
                failedAttempts: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                },
                suspiciousAttempts: {
                    $sum: { $cond: ['$isSuspicious', 1, 0] }
                },
                uniqueDevices: { $addToSet: '$deviceInfo.deviceId' },
                uniqueIPs: { $addToSet: '$deviceInfo.ip' }
            }
        },
        {
            $project: {
                _id: 0,
                totalAttempts: 1,
                successfulLogins: 1,
                failedAttempts: 1,
                suspiciousAttempts: 1,
                uniqueDeviceCount: { $size: { $ifNull: ['$uniqueDevices', []] } },
                uniqueIPCount: { $size: { $ifNull: ['$uniqueIPs', []] } }
            }
        }
    ]);

    return stats[0] || {
        totalAttempts: 0,
        successfulLogins: 0,
        failedAttempts: 0,
        suspiciousAttempts: 0,
        uniqueDeviceCount: 0,
        uniqueIPCount: 0
    };
};

// Static method to cleanup old login history
loginHistorySchema.statics.cleanupOldRecords = async function(days: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({
        loginAt: { $lt: cutoffDate }
    });
    return result.deletedCount;
};

export default mongoose.model<ILoginHistoryDocument>('LoginHistory', loginHistorySchema);
