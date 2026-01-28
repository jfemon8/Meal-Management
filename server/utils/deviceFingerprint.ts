import crypto from 'crypto';
// @ts-ignore
import UAParser from 'ua-parser-js';
import { Request } from 'express';

interface DeviceInfo {
    userAgent: string;
    browser: string;
    browserVersion: string;
    os: string;
    platform: string;
    device: string;
    deviceModel: string;
    deviceVendor: string;
    ip: string;
    deviceId: string;
}

/**
 * Extract device information from request
 */
const extractDeviceInfo = (req: Request): DeviceInfo => {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const ip = req.ip ||
               (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] as string ||
               (req as any).connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'unknown';

    const deviceInfo: DeviceInfo = {
        userAgent: userAgent,
        browser: result.browser.name || 'Unknown',
        browserVersion: result.browser.version || '',
        os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'Unknown',
        platform: result.os.name || 'Unknown',
        device: result.device.type || 'Desktop',
        deviceModel: result.device.model || '',
        deviceVendor: result.device.vendor || '',
        ip: ip,
        deviceId: generateDeviceId(req)
    };

    return deviceInfo;
};

/**
 * Generate unique device identifier
 * Uses combination of IP, User Agent, and other headers
 */
const generateDeviceId = (req: Request): string => {
    const components = [
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        req.headers['sec-ch-ua'] || '',
        req.headers['sec-ch-ua-mobile'] || '',
        req.headers['sec-ch-ua-platform'] || '',
    ].filter(Boolean);

    const fingerprint = components.join('|');
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
};

/**
 * Get browser name in Bengali
 */
const getBrowserNameBengali = (browserName: string): string => {
    const browserMap: Record<string, string> = {
        'Chrome': 'ক্রোম',
        'Firefox': 'ফায়ারফক্স',
        'Safari': 'সাফারি',
        'Edge': 'এজ',
        'Opera': 'অপেরা',
        'IE': 'ইন্টারনেট এক্সপ্লোরার',
        'Samsung Browser': 'স্যামসাং ব্রাউজার'
    };

    return browserMap[browserName] || browserName;
};

/**
 * Get device type in Bengali
 */
const getDeviceTypeBengali = (deviceType: string): string => {
    const deviceMap: Record<string, string> = {
        'mobile': 'মোবাইল',
        'tablet': 'ট্যাবলেট',
        'desktop': 'ডেস্কটপ',
        'Desktop': 'ডেস্কটপ',
        'smarttv': 'স্মার্ট টিভি',
        'wearable': 'পরিধানযোগ্য ডিভাইস',
        'console': 'গেমিং কনসোল'
    };

    return deviceMap[deviceType] || deviceType;
};

/**
 * Get OS name in Bengali
 */
const getOSNameBengali = (osName: string): string => {
    const osMap: Record<string, string> = {
        'Windows': 'উইন্ডোজ',
        'Mac OS': 'ম্যাক ওএস',
        'Linux': 'লিনাক্স',
        'Android': 'অ্যান্ড্রয়েড',
        'iOS': 'আইওএস',
        'Ubuntu': 'উবুন্টু',
        'Debian': 'ডেবিয়ান'
    };

    return osMap[osName] || osName;
};

/**
 * Format device info for display (Bengali)
 */
const formatDeviceInfo = (deviceInfo: DeviceInfo): string => {
    const browser = getBrowserNameBengali(deviceInfo.browser);
    const device = getDeviceTypeBengali(deviceInfo.device);
    const os = getOSNameBengali(deviceInfo.platform);

    return `${browser} (${device}, ${os})`;
};

/**
 * Compare two device fingerprints
 */
const compareDevices = (deviceId1: string, deviceId2: string): boolean => {
    return deviceId1 === deviceId2;
};

/**
 * Check if device is mobile
 */
const isMobileDevice = (deviceInfo: DeviceInfo): boolean => {
    return deviceInfo.device.toLowerCase() === 'mobile';
};

/**
 * Check if device is tablet
 */
const isTabletDevice = (deviceInfo: DeviceInfo): boolean => {
    return deviceInfo.device.toLowerCase() === 'tablet';
};

/**
 * Check if device is desktop
 */
const isDesktopDevice = (deviceInfo: DeviceInfo): boolean => {
    return deviceInfo.device.toLowerCase() === 'desktop' || !deviceInfo.device;
};

/**
 * Get device category
 */
const getDeviceCategory = (deviceInfo: DeviceInfo): string => {
    if (isMobileDevice(deviceInfo)) return 'mobile';
    if (isTabletDevice(deviceInfo)) return 'tablet';
    return 'desktop';
};

/**
 * Sanitize IP address
 */
const sanitizeIP = (ip: string): string => {
    if (!ip) return 'unknown';

    // Remove IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    return ip;
};

export {
    extractDeviceInfo,
    generateDeviceId,
    getBrowserNameBengali,
    getDeviceTypeBengali,
    getOSNameBengali,
    formatDeviceInfo,
    compareDevices,
    isMobileDevice,
    isTabletDevice,
    isDesktopDevice,
    getDeviceCategory,
    sanitizeIP
};
