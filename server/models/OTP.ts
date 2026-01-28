import mongoose from 'mongoose';
import crypto from 'crypto';
import { IOTPDocument } from '../types';

const otpSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Identifier (email or phone)
    identifier: {
        type: String,
        required: true,
        index: true
    },
    identifierType: {
        type: String,
        enum: ['email', 'phone'],
        required: true
    },
    // OTP details
    otp: {
        type: String,
        required: true
    },
    otpHash: {
        type: String,
        required: true,
        index: true
    },
    // Purpose
    purpose: {
        type: String,
        enum: ['login', 'password_reset', 'email_verification', 'phone_verification', '2fa', 'account_activation'],
        required: true,
        index: true
    },
    // Validity
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: Date,
    // Attempt tracking
    verificationAttempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedAt: Date,
    // Device and security
    deviceInfo: {
        ip: String,
        userAgent: String,
        deviceId: String
    },
    // Metadata
    metadata: {
        type: Map,
        of: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes
otpSchema.index({ identifier: 1, purpose: 1, expiresAt: 1 });
otpSchema.index({ otpHash: 1, isUsed: 1, expiresAt: 1 });

// Method to check if OTP is valid
otpSchema.methods.isValid = function(): boolean {
    return !this.isUsed &&
           !this.isLocked &&
           new Date() < this.expiresAt &&
           this.verificationAttempts < this.maxAttempts;
};

// Method to verify OTP
otpSchema.methods.verify = async function(otpCode: string): Promise<boolean> {
    // Check if OTP is still valid
    if (!this.isValid()) {
        if (this.isUsed) {
            throw new Error('OTP ইতিমধ্যে ব্যবহৃত হয়েছে');
        }
        if (this.isLocked) {
            throw new Error('অনেকবার ভুল চেষ্টার কারণে OTP লক হয়ে গেছে');
        }
        if (new Date() >= this.expiresAt) {
            throw new Error('OTP মেয়াদ শেষ হয়ে গেছে');
        }
        if (this.verificationAttempts >= this.maxAttempts) {
            throw new Error('সর্বোচ্চ চেষ্টা অতিক্রম করেছেন');
        }
    }

    // Increment attempt count
    this.verificationAttempts += 1;

    // Verify OTP
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

    if (otpHash !== this.otpHash) {
        // Lock if max attempts reached
        if (this.verificationAttempts >= this.maxAttempts) {
            this.isLocked = true;
            this.lockedAt = new Date();
        }
        await this.save();
        throw new Error('ভুল OTP কোড');
    }

    // Mark as used
    this.isUsed = true;
    this.usedAt = new Date();
    await this.save();

    return true;
};

// Method to extend expiry
otpSchema.methods.extend = function(minutes: number = 5) {
    this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    return this.save();
};

interface GenerateOTPOptions {
    user?: mongoose.Types.ObjectId | string;
    identifier: string;
    identifierType: string;
    purpose: string;
    expiryMinutes?: number;
    otpLength?: number;
    deviceInfo?: Record<string, any>;
    metadata?: Record<string, any>;
}

// Static method to generate OTP
otpSchema.statics.generate = async function({
    user,
    identifier,
    identifierType,
    purpose,
    expiryMinutes = 10,
    otpLength = 6,
    deviceInfo = {},
    metadata = {}
}: GenerateOTPOptions) {
    // Generate random OTP
    const otp = crypto.randomInt(100000, 999999).toString().padStart(otpLength, '0');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Invalidate existing OTPs for same identifier and purpose
    await this.updateMany(
        {
            identifier,
            purpose,
            isUsed: false,
            isLocked: false
        },
        {
            isUsed: true,
            usedAt: new Date()
        }
    );

    // Create new OTP
    const otpDoc = await this.create({
        user,
        identifier,
        identifierType,
        otp, // Store plain OTP temporarily (will be removed before saving)
        otpHash,
        purpose,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
        deviceInfo,
        metadata
    });

    // Return OTP code (only available here, not stored)
    return {
        otpDoc,
        otpCode: otp
    };
};

// Static method to verify OTP by identifier
otpSchema.statics.verifyByIdentifier = async function(identifier: string, otpCode: string, purpose: string): Promise<boolean> {
    const otpDoc = await this.findOne({
        identifier,
        purpose,
        isUsed: false,
        isLocked: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
        throw new Error('কোনো বৈধ OTP পাওয়া যায়নি');
    }

    return otpDoc.verify(otpCode);
};

// Static method to check rate limiting
otpSchema.statics.checkRateLimit = async function(identifier: string, purpose: string, minutes: number = 15, maxAttempts: number = 5): Promise<boolean> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const count = await this.countDocuments({
        identifier,
        purpose,
        createdAt: { $gte: since }
    });

    if (count >= maxAttempts) {
        const oldestOTP = await this.findOne({
            identifier,
            purpose,
            createdAt: { $gte: since }
        }).sort({ createdAt: 1 });

        const waitTime = Math.ceil((oldestOTP.createdAt.getTime() + minutes * 60 * 1000 - Date.now()) / 60000);
        throw new Error(`অনেকবার চেষ্টা করেছেন। ${waitTime} মিনিট পরে আবার চেষ্টা করুন।`);
    }

    return true;
};

// Static method to cleanup expired OTPs
otpSchema.statics.cleanupExpired = async function(): Promise<number> {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isUsed: true, usedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // 24 hours old used OTPs
        ]
    });
    return result.deletedCount;
};

// Static method to get recent OTP attempts
otpSchema.statics.getRecentAttempts = async function(identifier: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.find({
        identifier,
        createdAt: { $gte: since }
    }).sort({ createdAt: -1 });
};

// Remove plain OTP before saving (security)
otpSchema.pre('save', function(next) {
    if (this.isNew && this.otp) {
        // OTP is only kept temporarily for generation, remove it after first save
        this.otp = undefined as any;
    }
    next();
});

export default mongoose.model<IOTPDocument>('OTP', otpSchema);
