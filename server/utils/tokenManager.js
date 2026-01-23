const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

/**
 * Generate Access Token (Short-lived)
 * @param {string} userId - User ID
 * @returns {string} JWT access token
 */
const generateAccessToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // 15 minutes
    );
};

/**
 * Generate Refresh Token (Long-lived)
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information
 * @param {string} tokenFamily - Token family ID (for rotation tracking)
 * @returns {Promise<Object>} Refresh token document and token string
 */
const generateRefreshToken = async (userId, deviceInfo = {}, tokenFamily = null) => {
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
 * @param {string} userId - User ID
 * @param {Object} deviceInfo - Device information
 * @param {string} tokenFamily - Token family ID
 * @returns {Promise<Object>} Access and refresh tokens
 */
const generateTokenPair = async (userId, deviceInfo = {}, tokenFamily = null) => {
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
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
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
 * @param {string} token - Refresh token
 * @returns {Promise<Object>} Refresh token document
 */
const verifyRefreshToken = async (token) => {
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
 * @param {string} oldToken - Old refresh token
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Object>} New token pair
 */
const rotateRefreshToken = async (oldToken, deviceInfo = {}) => {
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
 * @param {string} token - Refresh token to revoke
 * @param {string} reason - Revocation reason
 * @returns {Promise<Object>} Revoked token document
 */
const revokeRefreshToken = async (token, reason = 'user_logout') => {
    const refreshToken = await RefreshToken.findOne({ token });

    if (!refreshToken) {
        throw new Error('টোকেন পাওয়া যায়নি');
    }

    return refreshToken.revoke(reason);
};

/**
 * Revoke All User Tokens
 * @param {string} userId - User ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<Object>} Update result
 */
const revokeAllUserTokens = async (userId, reason = 'user_logout') => {
    return RefreshToken.revokeAllForUser(userId, reason);
};

/**
 * Get Active Sessions for User
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active refresh tokens
 */
const getActiveSessions = async (userId) => {
    return RefreshToken.find({
        user: userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

/**
 * Cleanup Expired Tokens
 * @returns {Promise<number>} Number of deleted tokens
 */
const cleanupExpiredTokens = async () => {
    return RefreshToken.cleanupExpired();
};

/**
 * Validate Token Pair
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} Validation result
 */
const validateTokenPair = async (accessToken, refreshToken) => {
    try {
        // Try to verify access token
        const decoded = verifyAccessToken(accessToken);
        return {
            valid: true,
            userId: decoded.id,
            needsRefresh: false
        };
    } catch (error) {
        // Access token expired, check refresh token
        if (error.message.includes('মেয়াদ')) {
            try {
                const refreshTokenDoc = await verifyRefreshToken(refreshToken);
                return {
                    valid: true,
                    userId: refreshTokenDoc.user,
                    needsRefresh: true
                };
            } catch (refreshError) {
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

module.exports = {
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
