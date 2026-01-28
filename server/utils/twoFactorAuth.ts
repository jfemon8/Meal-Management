// @ts-ignore
import speakeasy from 'speakeasy';
// @ts-ignore
import QRCode from 'qrcode';
import crypto from 'crypto';
import { IBackupCode } from '../types';

interface GenerateSecretResult {
    secret: string;
    otpauthUrl: string;
}

interface VerifyBackupCodeResult {
    valid: boolean;
    codeIndex: number;
}

/**
 * Generate 2FA secret for user
 */
const generateSecret = (userEmail: string, userName: string): GenerateSecretResult => {
    const secret = speakeasy.generateSecret({
        name: `Meal Management (${userEmail})`,
        issuer: 'Meal Management System',
        length: 32
    });

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url
    };
};

/**
 * Generate QR code from OTP Auth URL
 */
const generateQRCode = async (otpauthUrl: string): Promise<string> => {
    try {
        const qrCodeDataURL: string = await QRCode.toDataURL(otpauthUrl);
        return qrCodeDataURL;
    } catch (error) {
        console.error('QR Code generation error:', error);
        throw new Error('QR কোড তৈরি করতে ব্যর্থ');
    }
};

/**
 * Verify TOTP token
 */
const verifyToken = (token: string, secret: string, window: number = 1): boolean => {
    try {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: window // Allow 30 seconds before/after
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
};

/**
 * Generate backup codes
 */
const generateBackupCodes = (count: number = 10): IBackupCode[] => {
    const codes: IBackupCode[] = [];

    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const formattedCode = (code.match(/.{1,4}/g) as string[]).join('-'); // Format: XXXX-XXXX

        codes.push({
            code: formattedCode,
            used: false
        });
    }

    return codes;
};

/**
 * Verify backup code
 */
const verifyBackupCode = (code: string, backupCodes: IBackupCode[]): VerifyBackupCodeResult => {
    const normalizedCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    for (let i = 0; i < backupCodes.length; i++) {
        const storedCode = backupCodes[i].code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

        if (storedCode === normalizedCode && !backupCodes[i].used) {
            return {
                valid: true,
                codeIndex: i
            };
        }
    }

    return {
        valid: false,
        codeIndex: -1
    };
};

/**
 * Format backup codes for display (Bengali)
 */
const formatBackupCodesForDisplay = (backupCodes: IBackupCode[]): string[] => {
    return backupCodes
        .filter((bc: IBackupCode) => !bc.used)
        .map((bc: IBackupCode) => bc.code);
};

/**
 * Get current TOTP token (for testing/development)
 */
const getCurrentToken = (secret: string): string => {
    return speakeasy.totp({
        secret: secret,
        encoding: 'base32'
    });
};

/**
 * Get time remaining for current token (in seconds)
 */
const getTimeRemaining = (): number => {
    const epoch = Math.floor(Date.now() / 1000);
    const countDown = 30 - (epoch % 30);
    return countDown;
};

/**
 * Validate backup code format
 */
const isValidBackupCodeFormat = (code: string): boolean => {
    // Format: XXXX-XXXX (8 hex characters with optional dash)
    const normalized = code.replace(/[^A-Z0-9]/gi, '');
    return /^[A-F0-9]{8}$/i.test(normalized);
};

/**
 * Generate setup instructions in Bengali
 */
const getSetupInstructions = (appName: string = 'Google Authenticator'): string[] => {
    return [
        `${appName} অ্যাপ ডাউনলোড করুন (যদি ইতিমধ্যে না থাকে)`,
        'অ্যাপে "+" বা "Add Account" বাটনে ক্লিক করুন',
        'QR কোড স্ক্যান করুন অথবা সিক্রেট কী ম্যানুয়ালি প্রবেশ করান',
        'অ্যাপে দেখানো 6 ডিজিটের কোড প্রবেশ করে যাচাই করুন',
        'ব্যাকআপ কোডগুলি নিরাপদ স্থানে সংরক্ষণ করুন'
    ];
};

/**
 * Check if 2FA is required for user based on role
 */
const is2FARecommended = (role: string): boolean => {
    // Recommend 2FA for admin and superadmin roles
    return ['admin', 'superadmin'].includes(role);
};

export {
    generateSecret,
    generateQRCode,
    verifyToken,
    generateBackupCodes,
    verifyBackupCode,
    formatBackupCodesForDisplay,
    getCurrentToken,
    getTimeRemaining,
    isValidBackupCodeFormat,
    getSetupInstructions,
    is2FARecommended
};
