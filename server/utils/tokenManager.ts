import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';

interface DeviceInfo {
    browser?: string;
    os?: string;
    device?: string;
    ip?: string;
    userAgent?: string;
    browserVersion?: string;
    platform?: string;
    deviceModel?: string;
    deviceVendor?: string;
    deviceId?: string;
}

interface TokenPairResult {
    accessToken: string;
    refreshToken: string;
    tokenFamily: string;
    accessTokenExpiresIn: number;
    refreshTokenExpiresIn: number;
}

interface GenerateRefreshTokenResult {
    refreshToken: any;
    token: string;
    tokenFamily: string;
}

interface TokenValidationResult {
    valid: boolean;
    userId?: string;
    needsRefresh?: boolean;
    error?: string;
}

/**
 * Generate Access Token (Short-lived)
 */
const generateAccessToken = (userId: string): string => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' } // 15 minutes
    );
};

/**
 * Generate Refresh Token (Long-lived)
 */
const generateRefreshToken = async (userId: string, deviceInfo: DeviceInfo = {}, tokenFamily: string | null = null): Promise<GenerateRefreshTokenResult> => {
    // Generate random token
    const token = crypto.randomBytes(64).toString('hex');

    // Create token family if not provided
    if (!tokenFamily) {
        tokenFamily = crypto.randomBytes(32).toString('hex');
    }

    // Create refresh token document
    const refreshToken = await RefreshToken.create({
        user: userId,
        token,
        deviceInfo,
        tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
        refreshToken: refreshToken,
        token: token,
        tokenFamily: tokenFamily
    };
};

/**
 * Generate Token Pair (Access + Refresh)
 */
const generateTokenPair = async (userId: string, deviceInfo: DeviceInfo = {}, tokenFamily: string | null = null): Promise<TokenPairResult> => {
    const accessToken = generateAccessToken(userId);
    const { token: refreshToken, tokenFamily: newTokenFamily } = await generateRefreshToken(
        userId,
        deviceInfo,
        tokenFamily
    );

    return {
        accessToken,
        refreshToken,
        tokenFamily: newTokenFamily,
        accessTokenExpiresIn: 15 * 60, // 15 minutes in seconds
        refreshTokenExpiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token: string): any => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('টোকেনের মেয়াদ শেষ হয়ে গেছে');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('অবৈধ টোকেন');
        }
        throw error;
    }
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = async (token: string): Promise<any> => {
    const refreshToken = await RefreshToken.findOne({ token });

    if (!refreshToken) {
        throw new Error('অবৈধ রিফ্রেশ টোকেন');
    }

    if (!refreshToken.isValid()) {
        throw new Error('রিফ্রেশ টোকেনের মেয়াদ শেষ বা বাতিল হয়েছে');
    }

    return refreshToken;
};

/**
 * Rotate Refresh Token (Token Rotation Strategy)
 */
const rotateRefreshToken = async (oldToken: string, deviceInfo: DeviceInfo = {}): Promise<TokenPairResult> => {
    // Verify old token
    const oldRefreshToken = await verifyRefreshToken(oldToken);

    // Check for token reuse (potential breach)
    if (oldRefreshToken.isRevoked) {
        // Token reuse detected! Revoke entire token family
        await RefreshToken.revokeTokenFamily(oldRefreshToken.tokenFamily);
        throw new Error('সন্দেহজনক কার্যকলাপ সনাক্ত হয়েছে। সকল সেশন বাতিল করা হয়েছে।');
    }

    // Revoke old token
    await oldRefreshToken.revoke('token_refresh');

    // Generate new token pair using same token family
    const newTokens = await generateTokenPair(
        oldRefreshToken.user,
        deviceInfo,
        oldRefreshToken.tokenFamily
    );

    return newTokens;
};

/**
 * Revoke Refresh Token
 */
const revokeRefreshToken = async (token: string, reason: string = 'user_logout'): Promise<any> => {
    const refreshToken = await RefreshToken.findOne({ token });

    if (!refreshToken) {
        throw new Error('টোকেন পাওয়া যায়নি');
    }

    return refreshToken.revoke(reason);
};

/**
 * Revoke All User Tokens
 */
const revokeAllUserTokens = async (userId: string, reason: string = 'user_logout'): Promise<any> => {
    return RefreshToken.revokeAllForUser(userId, reason);
};

/**
 * Get Active Sessions for User
 */
const getActiveSessions = async (userId: string): Promise<any[]> => {
    return RefreshToken.find({
        user: userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

/**
 * Cleanup Expired Tokens
 */
const cleanupExpiredTokens = async (): Promise<any> => {
    return RefreshToken.cleanupExpired();
};

/**
 * Validate Token Pair
 */
const validateTokenPair = async (accessToken: string, refreshToken: string): Promise<TokenValidationResult> => {
    try {
        // Try to verify access token
        const decoded = verifyAccessToken(accessToken);
        return {
            valid: true,
            userId: decoded.id,
            needsRefresh: false
        };
    } catch (error: any) {
        // Access token expired, check refresh token
        if (error.message.includes('মেয়াদ')) {
            try {
                const refreshTokenDoc = await verifyRefreshToken(refreshToken);
                return {
                    valid: true,
                    userId: refreshTokenDoc.user,
                    needsRefresh: true
                };
            } catch (refreshError: any) {
                return {
                    valid: false,
                    error: refreshError.message
                };
            }
        }
        return {
            valid: false,
            error: error.message
        };
    }
};

export {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    rotateRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    getActiveSessions,
    cleanupExpiredTokens,
    validateTokenPair
};
