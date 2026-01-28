import mongoose from 'mongoose';
import { IRefreshTokenDocument } from '../types';

const refreshTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Device information
    deviceInfo: {
        userAgent: String,
        platform: String,
        browser: String,
        os: String,
        ip: String,
        deviceId: String // Unique device identifier
    },
    // Token validity
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    revokedAt: {
        type: Date
    },
    revokedReason: {
        type: String,
        enum: ['user_logout', 'token_refresh', 'security_breach', 'manual_revoke', 'expired'],
        default: null
    },
    // Token family (for rotation detection)
    tokenFamily: {
        type: String,
        required: true,
        index: true
    },
    // Last used timestamp
    lastUsedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for cleanup queries
refreshTokenSchema.index({ expiresAt: 1, isRevoked: 1 });

// Method to check if token is valid
refreshTokenSchema.methods.isValid = function(): boolean {
    return !this.isRevoked && new Date() < this.expiresAt;
};

// Method to revoke token
refreshTokenSchema.methods.revoke = function(reason: string = 'manual_revoke') {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
    return this.save();
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function(userId: mongoose.Types.ObjectId | string, reason: string = 'user_logout') {
    return this.updateMany(
        { user: userId, isRevoked: false },
        {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: reason
        }
    );
};

// Static method to revoke all tokens in a token family (for rotation breach detection)
refreshTokenSchema.statics.revokeTokenFamily = async function(tokenFamily: string) {
    return this.updateMany(
        { tokenFamily, isRevoked: false },
        {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'security_breach'
        }
    );
};

// Static method to cleanup expired tokens
refreshTokenSchema.statics.cleanupExpired = async function(): Promise<number> {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isRevoked: true, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days old revoked tokens
        ]
    });
    return result.deletedCount;
};

export default mongoose.model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);
