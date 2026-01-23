const axios = require('axios');
const Holiday = require('../models/Holiday');

// Nager API base URL - Free public holiday API
const NAGER_API_BASE = 'https://date.nager.at/api/v3';

/**
 * Fetch public holidays from Nager API for Bangladesh
 * @param {number} year - Year to fetch holidays for
 * @returns {Promise<Array>}
 */
const fetchBangladeshHolidays = async (year) => {
    try {
        const response = await axios.get(`${NAGER_API_BASE}/PublicHolidays/${year}/BD`, {
            timeout: 10000 // 10 second timeout
        });
        return response.data;
    } catch (error) {
        console.error(`ছুটি ফেচ করতে সমস্যা (${year}):`, error.message);
        throw new Error(`বাংলাদেশের ছুটি ফেচ করতে ব্যর্থ: ${error.message}`);
    }
};

/**
 * Map Nager API holiday type to our system type
 * @param {Array} types - Array of type strings from API
 * @returns {string} - Our system holiday type
 */
const mapHolidayType = (types = []) => {
    if (types.includes('Public')) return 'government';
    if (types.includes('Optional')) return 'optional';
    return 'government';
};

/**
 * Convert API holiday name to Bengali (basic mapping)
 * @param {Object} apiHoliday - Holiday object from API
 * @returns {string} - Bengali name
 */
const getBengaliName = (apiHoliday) => {
    // Map of common holiday names to Bengali
    const nameMap = {
        "International Mother Language Day": "আন্তর্জাতিক মাতৃভাষা দিবস",
        "Sheikh Mujibur Rahman's Birthday": "জাতির পিতার জন্মদিন",
        "Independence Day": "স্বাধীনতা দিবস",
        "Bengali New Year": "পহেলা বৈশাখ",
        "May Day": "মে দিবস",
        "National Mourning Day": "জাতীয় শোক দিবস",
        "Victory Day": "বিজয় দিবস",
        "Eid ul-Fitr": "ঈদুল ফিতর",
        "Eid ul-Adha": "ঈদুল আযহা",
        "Shab e-Qadr": "শবে কদর",
        "Ashura": "আশুরা",
        "Milad un-Nabi": "ঈদ-ই-মিলাদুন্নবী",
        "Shab e-Barat": "শবে বরাত",
        "Durga Puja": "দুর্গা পূজা",
        "Buddha Purnima": "বুদ্ধ পূর্ণিমা",
        "Christmas Day": "বড়দিন",
        "Janmashtami": "জন্মাষ্টমী"
    };

    // Return mapped Bengali name or use localName or original name
    return nameMap[apiHoliday.name] || apiHoliday.localName || apiHoliday.name;
};

/**
 * Sync holidays from API to database
 * @param {number} year - Year to sync
 * @param {ObjectId} syncedBy - User who initiated sync (optional for cron)
 * @returns {Promise<{added: number, updated: number, skipped: number, errors: Array}>}
 */
const syncHolidays = async (year, syncedBy = null) => {
    const result = { added: 0, updated: 0, skipped: 0, errors: [] };

    try {
        const apiHolidays = await fetchBangladeshHolidays(year);

        for (const apiHoliday of apiHolidays) {
            try {
                const holidayDate = new Date(apiHoliday.date);
                holidayDate.setUTCHours(0, 0, 0, 0);

                // Check if holiday already exists for this date
                const existing = await Holiday.findOne({
                    date: {
                        $gte: new Date(holidayDate.setHours(0, 0, 0, 0)),
                        $lt: new Date(holidayDate.setHours(23, 59, 59, 999))
                    }
                });

                if (existing) {
                    // Update only if source is 'api' (don't overwrite manual entries)
                    if (existing.source === 'api') {
                        existing.name = apiHoliday.name;
                        existing.nameBn = getBengaliName(apiHoliday);
                        existing.type = mapHolidayType(apiHoliday.types);
                        existing.lastSyncedAt = new Date();
                        await existing.save();
                        result.updated++;
                    } else {
                        // Manual entry exists, skip
                        result.skipped++;
                    }
                } else {
                    // Create new holiday
                    await Holiday.create({
                        date: new Date(apiHoliday.date),
                        name: apiHoliday.name,
                        nameBn: getBengaliName(apiHoliday),
                        type: mapHolidayType(apiHoliday.types),
                        isRecurring: false,
                        isActive: true,
                        source: 'api',
                        addedBy: syncedBy,
                        lastSyncedAt: new Date()
                    });
                    result.added++;
                }
            } catch (err) {
                result.errors.push(`${apiHoliday.date} (${apiHoliday.name}): ${err.message}`);
            }
        }

        console.log(`✅ ${year} সালের ছুটি সিঙ্ক সম্পন্ন:`, {
            added: result.added,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors.length
        });

        return result;
    } catch (error) {
        console.error(`❌ ${year} সালের ছুটি সিঙ্ক ব্যর্থ:`, error.message);
        throw error;
    }
};

/**
 * Check if API is available
 * @returns {Promise<boolean>}
 */
const checkApiAvailability = async () => {
    try {
        const response = await axios.get(`${NAGER_API_BASE}/AvailableCountries`, {
            timeout: 5000
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
};

module.exports = {
    fetchBangladeshHolidays,
    syncHolidays,
    checkApiAvailability,
    getBengaliName,
    mapHolidayType
};
