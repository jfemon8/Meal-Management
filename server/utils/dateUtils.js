/**
 * Utility functions for date and meal calculations
 */

/**
 * Check if a date is Friday
 * @param {Date} date 
 * @returns {boolean}
 */
const isFriday = (date) => {
    return new Date(date).getDay() === 5;
};

/**
 * Check if a date is an odd Saturday of the month
 * (1st, 3rd, 5th Saturday)
 * @param {Date} date 
 * @returns {boolean}
 */
const isOddSaturday = (date) => {
    const d = new Date(date);
    if (d.getDay() !== 6) return false; // Not Saturday

    // Find which Saturday of the month this is
    const dayOfMonth = d.getDate();
    const saturdayNumber = Math.ceil(dayOfMonth / 7);

    return saturdayNumber % 2 === 1; // Odd Saturday (1st, 3rd, 5th)
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

    // Find first Saturday
    while (date.getDay() !== 6) {
        date.setDate(date.getDate() + 1);
    }

    // Get all Saturdays of the month
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
    return saturdays.filter((_, index) => index % 2 === 0); // 0-indexed, so 0, 2, 4 are 1st, 3rd, 5th
};

/**
 * Check if a date should have meal OFF by default
 * (Friday, odd Saturday, or holiday)
 * @param {Date} date 
 * @param {Date[]} holidays - Array of holiday dates
 * @returns {boolean}
 */
const isDefaultMealOff = (date, holidays = []) => {
    const d = new Date(date);

    // Check Friday
    if (isFriday(d)) return true;

    // Check odd Saturday
    if (isOddSaturday(d)) return true;

    // Check holidays
    const dateStr = d.toISOString().split('T')[0];
    const isHoliday = holidays.some(h => {
        const holidayStr = new Date(h).toISOString().split('T')[0];
        return holidayStr === dateStr;
    });

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
    const endDate = new Date(year, month, 0); // Last day of month
    return { startDate, endDate };
};

/**
 * Get array of dates between two dates (inclusive)
 * @param {Date} startDate 
 * @param {Date} endDate 
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
 * Format date to YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

/**
 * Check if a date is today
 * @param {Date} date 
 * @returns {boolean}
 */
const isToday = (date) => {
    const today = new Date();
    const d = new Date(date);
    return d.toISOString().split('T')[0] === today.toISOString().split('T')[0];
};

/**
 * Check if a date is in the past
 * @param {Date} date 
 * @returns {boolean}
 */
const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
};

/**
 * Check if a date is in the future
 * @param {Date} date 
 * @returns {boolean}
 */
const isFuture = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today;
};

/**
 * Validate date range (max 31 days)
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {boolean}
 */
const isValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays <= 31 && start <= end;
};

module.exports = {
    isFriday,
    isOddSaturday,
    getSaturdaysOfMonth,
    getOddSaturdaysOfMonth,
    isDefaultMealOff,
    getDefaultMonthRange,
    getDatesBetween,
    formatDate,
    isToday,
    isPast,
    isFuture,
    isValidDateRange
};
