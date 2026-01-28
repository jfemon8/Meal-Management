/**
 * Utility functions for date and meal calculations
 * All dates are in Asia/Dhaka timezone (UTC+6)
 * Date format: dd MMMM yyyy (e.g., 27 January 2026)
 * Time format: hh:mm:ss AM/PM (e.g., 02:30:45 PM)
 */

// Bangladesh timezone offset in milliseconds (UTC+6)
const BD_TIMEZONE_OFFSET: number = 6 * 60 * 60 * 1000;
const BD_TIMEZONE: string = 'Asia/Dhaka';

// Bengali month names
const BENGALI_MONTHS: string[] = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Bengali day names
const BENGALI_DAYS: string[] = [
    'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

// English month names
const ENGLISH_MONTHS: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// English day names
const ENGLISH_DAYS: string[] = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

/**
 * Convert any date to Bangladesh timezone
 */
const toBDTime = (date: Date | string = new Date()): Date => {
    const d = new Date(date);
    // Get UTC time and add Bangladesh offset
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + BD_TIMEZONE_OFFSET);
};

/**
 * Get current date/time in Bangladesh timezone
 */
const nowBD = (): Date => toBDTime(new Date());

/**
 * Format date as dd MMMM yyyy (Bengali)
 * e.g., "২৭ জানুয়ারি ২০২৬"
 */
const formatDateBn = (date: Date | string): string => {
    const d = toBDTime(date);
    const day = d.getDate();
    const month = BENGALI_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${toBengaliNumber(day)} ${month} ${toBengaliNumber(year)}`;
};

/**
 * Format date as dd MMMM yyyy (English)
 * e.g., "27 January 2026"
 */
const formatDateEn = (date: Date | string): string => {
    const d = toBDTime(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = ENGLISH_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};

/**
 * Format time as hh:mm:ss AM/PM
 * e.g., "02:30:45 PM"
 */
const formatTime = (date: Date | string): string => {
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
 * e.g., "০২:৩০:৪৫ PM"
 */
const formatTimeBn = (date: Date | string): string => {
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
 */
const formatDateTime = (date: Date | string, locale: string = 'bn'): string => {
    if (locale === 'bn') {
        return `${formatDateBn(date)}, ${formatTimeBn(date)}`;
    }
    return `${formatDateEn(date)}, ${formatTime(date)}`;
};

/**
 * Format date with day name
 * e.g., "শুক্রবার, ২৭ জানুয়ারি ২০২৬"
 */
const formatDateWithDay = (date: Date | string, locale: string = 'bn'): string => {
    const d = toBDTime(date);
    const dayName = locale === 'bn' ? BENGALI_DAYS[d.getDay()] : ENGLISH_DAYS[d.getDay()];
    const dateStr = locale === 'bn' ? formatDateBn(date) : formatDateEn(date);
    return `${dayName}, ${dateStr}`;
};

/**
 * Convert number to Bengali digits
 */
const toBengaliNumber = (num: number | string): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

/**
 * Format date as YYYY-MM-DD (ISO format, for API/DB)
 */
const formatDateISO = (date: Date | string): string => {
    const d = toBDTime(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format date as dd/MM/yyyy
 */
const formatDateShort = (date: Date | string): string => {
    const d = toBDTime(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Check if a date is Friday (in BD timezone)
 */
const isFriday = (date: Date | string): boolean => {
    return toBDTime(date).getDay() === 5;
};

/**
 * Check if a date is an odd Saturday of the month (1st, 3rd, 5th)
 */
const isOddSaturday = (date: Date | string): boolean => {
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
 */
const getSaturdaysOfMonth = (year: number, month: number): Date[] => {
    const saturdays: Date[] = [];
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
 */
const getOddSaturdaysOfMonth = (year: number, month: number): Date[] => {
    const saturdays = getSaturdaysOfMonth(year, month);
    return saturdays.filter((_: Date, index: number) => index % 2 === 0);
};

/**
 * Check if a date should have meal OFF by default
 */
const isDefaultMealOff = (date: Date | string, holidays: Date[] = []): boolean => {
    const d = toBDTime(date);

    if (isFriday(d)) return true;
    if (isOddSaturday(d)) return true;

    const dateStr = formatDateISO(d);
    const isHoliday = holidays.some((h: Date) => formatDateISO(h) === dateStr);

    return isHoliday;
};

/**
 * Get date range for a month
 */
const getDefaultMonthRange = (year: number, month: number): { startDate: Date; endDate: Date } => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return { startDate, endDate };
};

/**
 * Get array of dates between two dates (inclusive)
 */
const getDatesBetween = (startDate: Date | string, endDate: Date | string): Date[] => {
    const dates: Date[] = [];
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
 */
const isToday = (date: Date | string): boolean => {
    return formatDateISO(date) === formatDateISO(nowBD());
};

/**
 * Check if a date is in the past (in BD timezone)
 */
const isPast = (date: Date | string): boolean => {
    return formatDateISO(date) < formatDateISO(nowBD());
};

/**
 * Check if a date is in the future (in BD timezone)
 */
const isFuture = (date: Date | string): boolean => {
    return formatDateISO(date) > formatDateISO(nowBD());
};

/**
 * Validate date range (max 31 days)
 */
const isValidDateRange = (startDate: Date | string, endDate: Date | string): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays <= 31 && start <= end;
};

/**
 * Get start of day in BD timezone
 */
const startOfDayBD = (date: Date | string = new Date()): Date => {
    const d = toBDTime(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get end of day in BD timezone
 */
const endOfDayBD = (date: Date | string = new Date()): Date => {
    const d = toBDTime(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Parse date string and return BD timezone date
 */
const parseDateBD = (dateStr: string): Date => {
    return toBDTime(new Date(dateStr));
};

/**
 * Get month name in Bengali
 */
const getMonthNameBn = (month: number): string => BENGALI_MONTHS[month];

/**
 * Get month name in English
 */
const getMonthNameEn = (month: number): string => ENGLISH_MONTHS[month];

/**
 * Get day name in Bengali
 */
const getDayNameBn = (day: number): string => BENGALI_DAYS[day];

/**
 * Get day name in English
 */
const getDayNameEn = (day: number): string => ENGLISH_DAYS[day];

export {
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
    formatDateISO as formatDate
};
