const cron = require('node-cron');
const { syncHolidays, checkApiAvailability } = require('../services/holidaySync');

/**
 * Initialize holiday sync cron jobs
 * Schedules automatic holiday syncing from external API
 */
const initHolidayCron = () => {
    // Check if cron is valid before scheduling
    const isValidCron = (expression) => cron.validate(expression);

    // Sync yearly holidays on January 1st at 00:00
    // Cron: minute hour day month weekday
    const yearlySync = '0 0 1 1 *';
    if (isValidCron(yearlySync)) {
        cron.schedule(yearlySync, async () => {
            console.log('🔄 বার্ষিক ছুটি সিঙ্ক শুরু হচ্ছে...');
            try {
                // Check API availability first
                const isAvailable = await checkApiAvailability();
                if (!isAvailable) {
                    console.log('⚠️ Holiday API অ্যাক্সেসযোগ্য নয়, সিঙ্ক স্কিপ করা হচ্ছে');
                    return;
                }

                const currentYear = new Date().getFullYear();

                // Sync current year
                const result = await syncHolidays(currentYear);
                console.log(`✅ ${currentYear} সালের ছুটি সিঙ্ক সম্পন্ন:`, result);

                // Also sync next year's holidays
                const nextYear = currentYear + 1;
                const nextResult = await syncHolidays(nextYear);
                console.log(`✅ ${nextYear} সালের ছুটি সিঙ্ক সম্পন্ন:`, nextResult);
            } catch (error) {
                console.error('❌ বার্ষিক ছুটি সিঙ্ক ব্যর্থ:', error.message);
            }
        });
        console.log('📅 Yearly holiday sync scheduled (January 1st, 00:00)');
    }

    // Monthly check for updates (1st of each month at 01:00)
    const monthlyCheck = '0 1 1 * *';
    if (isValidCron(monthlyCheck)) {
        cron.schedule(monthlyCheck, async () => {
            console.log('🔄 মাসিক ছুটি আপডেট চেক...');
            try {
                const isAvailable = await checkApiAvailability();
                if (!isAvailable) {
                    console.log('⚠️ Holiday API অ্যাক্সেসযোগ্য নয়');
                    return;
                }

                const currentYear = new Date().getFullYear();
                const result = await syncHolidays(currentYear);
                console.log(`✅ মাসিক আপডেট চেক সম্পন্ন:`, result);
            } catch (error) {
                console.error('❌ মাসিক আপডেট চেক ব্যর্থ:', error.message);
            }
        });
        console.log('📅 Monthly holiday check scheduled (1st of month, 01:00)');
    }

    console.log('✅ Holiday sync cron jobs initialized');
};

/**
 * Run immediate sync (for testing or manual trigger)
 * @param {number} year - Year to sync
 * @returns {Promise}
 */
const runImmediateSync = async (year = null) => {
    const targetYear = year || new Date().getFullYear();
    console.log(`🔄 Manual sync started for ${targetYear}...`);

    try {
        const isAvailable = await checkApiAvailability();
        if (!isAvailable) {
            throw new Error('Holiday API অ্যাক্সেসযোগ্য নয়');
        }

        const result = await syncHolidays(targetYear);
        return result;
    } catch (error) {
        console.error('❌ Manual sync failed:', error.message);
        throw error;
    }
};

module.exports = {
    initHolidayCron,
    runImmediateSync
};
