/**
 * Date utility functions for consistent formatting across the app
 * All dates are in Asia/Dhaka timezone (UTC+6)
 * Date format: dd MMMM yyyy (e.g., 27 January 2026)
 * Time format: hh:mm:ss AM/PM (e.g., 02:30:45 PM)
 */

// Bangladesh timezone offset in milliseconds (UTC+6)
export const BD_TIMEZONE_OFFSET = 6 * 60 * 60 * 1000;
export const BD_TIMEZONE = 'Asia/Dhaka';

// Bengali month names
export const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Bengali day names
export const BENGALI_DAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
];

// English month names
export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// English day names
export const ENGLISH_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

/**
 * Convert any date to Bangladesh timezone
 */
export const toBDTime = (date: Date | string = new Date()): Date => {
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + BD_TIMEZONE_OFFSET);
};

/**
 * Get current date/time in Bangladesh timezone
 */
export const nowBD = (): Date => toBDTime(new Date());

/**
 * Convert number to Bengali digits
 */
export const toBengaliNumber = (num: number | string): string => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit)]);
};

/**
 * Format date as dd MMMM yyyy (Bengali)
 * @returns e.g., "২৭ জানুয়ারি ২০২৬"
 */
export const formatDateBn = (date: Date | string): string => {
  const d = toBDTime(date);
  const day = d.getDate();
  const month = BENGALI_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${toBengaliNumber(day)} ${month} ${toBengaliNumber(year)}`;
};

/**
 * Format date as dd MMMM yyyy (English)
 * @returns e.g., "27 January 2026"
 */
export const formatDateEn = (date: Date | string): string => {
  const d = toBDTime(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = ENGLISH_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format time as hh:mm:ss AM/PM (English)
 * @returns e.g., "02:30:45 PM"
 */
export const formatTime = (date: Date | string): string => {
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
 * Format time as hh:mm AM/PM (short, no seconds)
 * @returns e.g., "02:30 PM"
 */
export const formatTimeShort = (date: Date | string): string => {
  const d = toBDTime(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

/**
 * Format time as hh:mm:ss AM/PM (Bengali)
 * @returns e.g., "০২:৩০:৪৫ PM"
 */
export const formatTimeBn = (date: Date | string): string => {
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
 * Format time as hh:mm AM/PM (Bengali, short)
 * @returns e.g., "০২:৩০ PM"
 */
export const formatTimeShortBn = (date: Date | string): string => {
  const d = toBDTime(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${toBengaliNumber(String(hours).padStart(2, '0'))}:${toBengaliNumber(minutes)} ${ampm}`;
};

/**
 * Format date and time together
 * @returns e.g., "২৭ জানুয়ারি ২০২৬, ০২:৩০:৪৫ PM"
 */
export const formatDateTime = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  if (locale === 'bn') {
    return `${formatDateBn(date)}, ${formatTimeBn(date)}`;
  }
  return `${formatDateEn(date)}, ${formatTime(date)}`;
};

/**
 * Format date and time (short, no seconds)
 * @returns e.g., "২৭ জানুয়ারি ২০২৬, ০২:৩০ PM"
 */
export const formatDateTimeShort = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  if (locale === 'bn') {
    return `${formatDateBn(date)}, ${formatTimeShortBn(date)}`;
  }
  return `${formatDateEn(date)}, ${formatTimeShort(date)}`;
};

/**
 * Format date with day name
 * @returns e.g., "শুক্রবার, ২৭ জানুয়ারি ২০২৬"
 */
export const formatDateWithDay = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  const d = toBDTime(date);
  const dayName = locale === 'bn' ? BENGALI_DAYS[d.getDay()] : ENGLISH_DAYS[d.getDay()];
  const dateStr = locale === 'bn' ? formatDateBn(date) : formatDateEn(date);
  return `${dayName}, ${dateStr}`;
};

/**
 * Format date with day name (short month)
 * @returns e.g., "শুক্রবার, ২৭ জানু"
 */
export const formatDateWithDayShort = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  const d = toBDTime(date);
  const dayName = locale === 'bn' ? BENGALI_DAYS[d.getDay()] : ENGLISH_DAYS[d.getDay()];
  const day = locale === 'bn' ? toBengaliNumber(d.getDate()) : String(d.getDate()).padStart(2, '0');
  const month = locale === 'bn' ? BENGALI_MONTHS[d.getMonth()].slice(0, 4) : ENGLISH_MONTHS[d.getMonth()].slice(0, 3);
  return `${dayName}, ${day} ${month}`;
};

/**
 * Format date with day name but no year
 * @returns e.g., "শুক্রবার, ২৭ জানুয়ারি"
 */
export const formatDateWithDayNoYear = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  const d = toBDTime(date);
  const dayName = locale === 'bn' ? BENGALI_DAYS[d.getDay()] : ENGLISH_DAYS[d.getDay()];
  const day = locale === 'bn' ? toBengaliNumber(d.getDate()) : String(d.getDate()).padStart(2, '0');
  const month = locale === 'bn' ? BENGALI_MONTHS[d.getMonth()] : ENGLISH_MONTHS[d.getMonth()];
  return `${dayName}, ${day} ${month}`;
};

/**
 * Format date as YYYY-MM-DD (ISO format, for API/DB)
 */
export const formatDateISO = (date: Date | string): string => {
  const d = toBDTime(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date as dd/MM/yyyy
 */
export const formatDateShort = (date: Date | string): string => {
  const d = toBDTime(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format month and year only
 * @returns e.g., "জানুয়ারি ২০২৬"
 */
export const formatMonthYear = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  const d = toBDTime(date);
  if (locale === 'bn') {
    return `${BENGALI_MONTHS[d.getMonth()]} ${toBengaliNumber(d.getFullYear())}`;
  }
  return `${ENGLISH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Check if a date is Friday (in BD timezone)
 */
export const isFriday = (date: Date | string): boolean => {
  return toBDTime(date).getDay() === 5;
};

/**
 * Check if a date is Saturday (in BD timezone)
 */
export const isSaturday = (date: Date | string): boolean => {
  return toBDTime(date).getDay() === 6;
};

/**
 * Check if a date is an odd Saturday of the month (1st, 3rd, 5th)
 */
export const isOddSaturday = (date: Date | string): boolean => {
  const d = toBDTime(date);
  if (d.getDay() !== 6) return false;

  const dayOfMonth = d.getDate();
  const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstSaturday = (6 - firstDayOfMonth.getDay() + 7) % 7 + 1;
  const saturdayNumber = Math.ceil((dayOfMonth - firstSaturday + 7) / 7);

  return saturdayNumber === 1 || saturdayNumber === 3 || saturdayNumber === 5;
};

/**
 * Check if a date is today (in BD timezone)
 */
export const isToday = (date: Date | string): boolean => {
  return formatDateISO(date) === formatDateISO(nowBD());
};

/**
 * Check if a date is in the past (in BD timezone)
 */
export const isPast = (date: Date | string): boolean => {
  return formatDateISO(date) < formatDateISO(nowBD());
};

/**
 * Check if a date is in the future (in BD timezone)
 */
export const isFuture = (date: Date | string): boolean => {
  return formatDateISO(date) > formatDateISO(nowBD());
};

/**
 * Get start of day in BD timezone
 */
export const startOfDayBD = (date: Date | string = new Date()): Date => {
  const d = toBDTime(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day in BD timezone
 */
export const endOfDayBD = (date: Date | string = new Date()): Date => {
  const d = toBDTime(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Parse date string and return BD timezone date
 */
export const parseDateBD = (dateStr: string): Date => {
  return toBDTime(new Date(dateStr));
};

/**
 * Get month name in Bengali
 */
export const getMonthNameBn = (month: number): string => BENGALI_MONTHS[month];

/**
 * Get month name in English
 */
export const getMonthNameEn = (month: number): string => ENGLISH_MONTHS[month];

/**
 * Get day name in Bengali
 */
export const getDayNameBn = (day: number): string => BENGALI_DAYS[day];

/**
 * Get day name in English
 */
export const getDayNameEn = (day: number): string => ENGLISH_DAYS[day];

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
export const getRelativeTime = (date: Date | string, locale: 'bn' | 'en' = 'bn'): string => {
  const d = toBDTime(date);
  const now = nowBD();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === 'bn') {
    if (diffSecs < 60) return 'এইমাত্র';
    if (diffMins < 60) return `${toBengaliNumber(diffMins)} মিনিট আগে`;
    if (diffHours < 24) return `${toBengaliNumber(diffHours)} ঘন্টা আগে`;
    if (diffDays < 7) return `${toBengaliNumber(diffDays)} দিন আগে`;
    return formatDateBn(date);
  }

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDateEn(date);
};

/**
 * Format currency with Bengali numerals
 */
export const formatCurrencyBn = (amount: number): string => {
  return `৳${toBengaliNumber(amount)}`;
};

/**
 * Format currency with English numerals
 */
export const formatCurrency = (amount: number): string => {
  return `৳${amount}`;
};

// Default export for convenience
const dateUtils = {
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
  formatTimeShort,
  formatTimeBn,
  formatTimeShortBn,
  formatDateTime,
  formatDateTimeShort,
  formatDateWithDay,
  formatDateWithDayShort,
  formatDateWithDayNoYear,
  formatMonthYear,
  toBengaliNumber,
  formatCurrency,
  formatCurrencyBn,

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
  isSaturday,
  isOddSaturday,
  isToday,
  isPast,
  isFuture,

  // Relative time
  getRelativeTime,
};

export default dateUtils;
