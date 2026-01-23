const crypto = require('crypto');
const UAParser = require('ua-parser-js');

/**
 * Extract device information from request
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
const extractDeviceInfo = (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const ip = req.ip ||
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'unknown';

    const deviceInfo = {
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
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint hash
 */
const generateDeviceId = (req) => {
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
 * @param {string} browserName - Browser name
 * @returns {string} Bengali browser name
 */
const getBrowserNameBengali = (browserName) => {
    const browserMap = {
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
 * @param {string} deviceType - Device type
 * @returns {string} Bengali device type
 */
const getDeviceTypeBengali = (deviceType) => {
    const deviceMap = {
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
 * @param {string} osName - OS name
 * @returns {string} Bengali OS name
 */
const getOSNameBengali = (osName) => {
    const osMap = {
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
 * @param {Object} deviceInfo - Device information object
 * @returns {string} Formatted device string
 */
const formatDeviceInfo = (deviceInfo) => {
    const browser = getBrowserNameBengali(deviceInfo.browser);
    const device = getDeviceTypeBengali(deviceInfo.device);
    const os = getOSNameBengali(deviceInfo.platform);

    return `${browser} (${device}, ${os})`;
};

/**
 * Compare two device fingerprints
 * @param {string} deviceId1 - First device ID
 * @param {string} deviceId2 - Second device ID
 * @returns {boolean} Whether devices match
 */
const compareDevices = (deviceId1, deviceId2) => {
    return deviceId1 === deviceId2;
};

/**
 * Check if device is mobile
 * @param {Object} deviceInfo - Device information object
 * @returns {boolean} True if mobile device
 */
const isMobileDevice = (deviceInfo) => {
    return deviceInfo.device.toLowerCase() === 'mobile';
};

/**
 * Check if device is tablet
 * @param {Object} deviceInfo - Device information object
 * @returns {boolean} True if tablet device
 */
const isTabletDevice = (deviceInfo) => {
    return deviceInfo.device.toLowerCase() === 'tablet';
};

/**
 * Check if device is desktop
 * @param {Object} deviceInfo - Device information object
 * @returns {boolean} True if desktop device
 */
const isDesktopDevice = (deviceInfo) => {
    return deviceInfo.device.toLowerCase() === 'desktop' || !deviceInfo.device;
};

/**
 * Get device category
 * @param {Object} deviceInfo - Device information object
 * @returns {string} Device category (mobile, tablet, desktop)
 */
const getDeviceCategory = (deviceInfo) => {
    if (isMobileDevice(deviceInfo)) return 'mobile';
    if (isTabletDevice(deviceInfo)) return 'tablet';
    return 'desktop';
};

/**
 * Sanitize IP address
 * @param {string} ip - IP address
 * @returns {string} Sanitized IP
 */
const sanitizeIP = (ip) => {
    if (!ip) return 'unknown';

    // Remove IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    return ip;
};

module.exports = {
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
