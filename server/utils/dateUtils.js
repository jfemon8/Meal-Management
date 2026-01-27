/**
 * Utility functions for date and meal calculations
 * All dates are in Asia/Dhaka timezone (UTC+6)
 * Date format: dd MMMM yyyy (e.g., 27 January 2026)
 * Time format: hh:mm:ss AM/PM (e.g., 02:30:45 PM)
 */

// Bangladesh timezone offset in milliseconds (UTC+6)
const BD_TIMEZONE_OFFSET = 6 * 60 * 60 * 1000;
const BD_TIMEZONE = 'Asia/Dhaka';

// Bengali month names
const BENGALI_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Bengali day names
const BENGALI_DAYS = [
    'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

// English month names
const ENGLISH_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// English day names
const ENGLISH_DAYS = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

/**
 * Convert any date to Bangladesh timezone
 * @param {Date|string} date
 * @returns {Date}
 */
const toBDTime = (date = new Date()) => {
    const d = new Date(date);
    // Get UTC time and add Bangladesh offset
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + BD_TIMEZONE_OFFSET);
};

/**
 * Get current date/time in Bangladesh timezone
 * @returns {Date}
 */
const nowBD = () => toBDTime(new Date());

/**
 * Format date as dd MMMM yyyy (Bengali)
 * @param {Date|string} date
 * @returns {string} e.g., "২৭ জানুয়ারি ২০২৬"
 */
const formatDateBn = (date) => {
    const d = toBDTime(date);
    const day = d.getDate();
    const month = BENGALI_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${toBengaliNumber(day)} ${month} ${toBengaliNumber(year)}`;
};

/**
 * Format date as dd MMMM yyyy (English)
 * @param {Date|string} date
 * @returns {string} e.g., "27 January 2026"
 */
const formatDateEn = (date) => {
    const d = toBDTime(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = ENGLISH_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};

/**
 * Format time as hh:mm:ss AM/PM
 * @param {Date|string} date
 * @returns {string} e.g., "02:30:45 PM"
 */
const formatTime = (date) => {
    const d = toBDTime(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Format time as hh:mm:ss AM/PM (Bengali)
 * @param {Date|string} date
 * @returns {string} e.g., "০২:৩০:৪৫ PM"
 */
const formatTimeBn = (date) => {
    const d = toBDTime(date);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${toBengaliNumber(String(hours).padStart(2, '0'))}:${toBengaliNumber(minutes)}:${toBengaliNumber(seconds)} ${ampm}`;
};

/**
 * Format date and time together
 * @param {Date|string} date
 * @param {string} locale - 'bn' or 'en'
 * @returns {string}
 */
const formatDateTime = (date, locale = 'bn') => {
    if (locale === 'bn') {
        return `${formatDateBn(date)}, ${formatTimeBn(date)}`;
    }
    return `${formatDateEn(date)}, ${formatTime(date)}`;
};

/**
 * Format date with day name
 * @param {Date|string} date
 * @param {string} locale - 'bn' or 'en'
 * @returns {string} e.g., "শুক্রবার, ২৭ জানুয়ারি ২০২৬"
 */
const formatDateWithDay = (date, locale = 'bn') => {
    const d = toBDTime(date);
    const dayName = locale === 'bn' ? BENGALI_DAYS[d.getDay()] : ENGLISH_DAYS[d.getDay()];
    const dateStr = locale === 'bn' ? formatDateBn(date) : formatDateEn(date);
    return `${dayName}, ${dateStr}`;
};

/**
 * Convert number to Bengali digits
 * @param {number|string} num
 * @returns {string}
 */
const toBengaliNumber = (num) => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

/**
 * Format date as YYYY-MM-DD (ISO format, for API/DB)
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateISO = (date) => {
    const d = toBDTime(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format date as dd/MM/yyyy
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateShort = (date) => {
    const d = toBDTime(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Check if a date is Friday (in BD timezone)
 * @param {Date|string} date
 * @returns {boolean}
 */
const isFriday = (date) => {
    return toBDTime(date).getDay() === 5;
};

/**
 * Check if a date is an odd Saturday of the month (1st, 3rd, 5th)
 * @param {Date|string} date
 * @returns {boolean}
 */
const isOddSaturday = (date) => {
    const d = toBDTime(date);
    if (d.getDay() !== 6) return false;

    const dayOfMonth = d.getDate();
    const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const firstSaturday = (6 - firstDayOfMonth.getDay() + 7) % 7 + 1;
    const saturdayNumber = Math.ceil((dayOfMonth - firstSaturday + 7) / 7);

    return saturdayNumber === 1 || saturdayNumber === 3 || saturdayNumber === 5;
};

/**
 * Get all Saturdays of a month
 * @param {number} year
 * @param {number} month (1-12)
 * @returns {Date[]}
 */
const getSaturdaysOfMonth = (year, month) => {
    const saturdays = [];
    const date = new Date(year, month - 1, 1);

    while (date.getDay() !== 6) {
        date.setDate(date.getDate() + 1);
    }

    while (date.getMonth() === month - 1) {
        saturdays.push(new Date(date));
        date.setDate(date.getDate() + 7);
    }

    return saturdays;
};

/**
 * Get odd Saturdays of a month (1st, 3rd, 5th)
 * @param {number} year
 * @param {number} month (1-12)
 * @returns {Date[]}
 */
const getOddSaturdaysOfMonth = (year, month) => {
    const saturdays = getSaturdaysOfMonth(year, month);
    return saturdays.filter((_, index) => index % 2 === 0);
};

/**
 * Check if a date should have meal OFF by default
 * @param {Date|string} date
 * @param {Date[]} holidays
 * @returns {boolean}
 */
const isDefaultMealOff = (date, holidays = []) => {
    const d = toBDTime(date);

    if (isFriday(d)) return true;
    if (isOddSaturday(d)) return true;

    const dateStr = formatDateISO(d);
    const isHoliday = holidays.some(h => formatDateISO(h) === dateStr);

    return isHoliday;
};

/**
 * Get date range for a month
 * @param {number} year
 * @param {number} month (1-12)
 * @returns {{ startDate: Date, endDate: Date }}
 */
const getDefaultMonthRange = (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return { startDate, endDate };
};

/**
 * Get array of dates between two dates (inclusive)
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {Date[]}
 */
const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
};

/**
 * Check if a date is today (in BD timezone)
 * @param {Date|string} date
 * @returns {boolean}
 */
const isToday = (date) => {
    return formatDateISO(date) === formatDateISO(nowBD());
};

/**
 * Check if a date is in the past (in BD timezone)
 * @param {Date|string} date
 * @returns {boolean}
 */
const isPast = (date) => {
    return formatDateISO(date) < formatDateISO(nowBD());
};

/**
 * Check if a date is in the future (in BD timezone)
 * @param {Date|string} date
 * @returns {boolean}
 */
const isFuture = (date) => {
    return formatDateISO(date) > formatDateISO(nowBD());
};

/**
 * Validate date range (max 31 days)
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {boolean}
 */
const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays <= 31 && start <= end;
};

/**
 * Get start of day in BD timezone
 * @param {Date|string} date
 * @returns {Date}
 */
const startOfDayBD = (date = new Date()) => {
    const d = toBDTime(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get end of day in BD timezone
 * @param {Date|string} date
 * @returns {Date}
 */
const endOfDayBD = (date = new Date()) => {
    const d = toBDTime(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Parse date string and return BD timezone date
 * @param {string} dateStr - Date string in various formats
 * @returns {Date}
 */
const parseDateBD = (dateStr) => {
    return toBDTime(new Date(dateStr));
};

/**
 * Get month name in Bengali
 * @param {number} month - Month index (0-11)
 * @returns {string}
 */
const getMonthNameBn = (month) => BENGALI_MONTHS[month];

/**
 * Get month name in English
 * @param {number} month - Month index (0-11)
 * @returns {string}
 */
const getMonthNameEn = (month) => ENGLISH_MONTHS[month];

/**
 * Get day name in Bengali
 * @param {number} day - Day index (0-6, 0=Sunday)
 * @returns {string}
 */
const getDayNameBn = (day) => BENGALI_DAYS[day];

/**
 * Get day name in English
 * @param {number} day - Day index (0-6, 0=Sunday)
 * @returns {string}
 */
const getDayNameEn = (day) => ENGLISH_DAYS[day];

module.exports = {
    // Timezone
    BD_TIMEZONE,
    BD_TIMEZONE_OFFSET,
    toBDTime,
    nowBD,
    startOfDayBD,
    endOfDayBD,
    parseDateBD,

    // Formatting
    formatDateBn,
    formatDateEn,
    formatDateISO,
    formatDateShort,
    formatTime,
    formatTimeBn,
    formatDateTime,
    formatDateWithDay,
    toBengaliNumber,

    // Month/Day names
    BENGALI_MONTHS,
    BENGALI_DAYS,
    ENGLISH_MONTHS,
    ENGLISH_DAYS,
    getMonthNameBn,
    getMonthNameEn,
    getDayNameBn,
    getDayNameEn,

    // Checks
    isFriday,
    isOddSaturday,
    isDefaultMealOff,
    isToday,
    isPast,
    isFuture,
    isValidDateRange,

    // Utilities
    getSaturdaysOfMonth,
    getOddSaturdaysOfMonth,
    getDefaultMonthRange,
    getDatesBetween,

    // Legacy alias
    formatDate: formatDateISO
};
