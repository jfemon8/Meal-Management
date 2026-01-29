import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Holiday from '../models/Holiday';
import { protect, isManager, isAdmin } from '../middleware/auth';
import { syncHolidays, fetchBangladeshHolidays, checkApiAvailability } from '../services/holidaySync';
import { formatDateISO, nowBD, startOfDayBD, toBDTime, isOddSaturday } from '../utils/dateUtils';
import { AuthRequest } from '../types';

const router = express.Router();

// Bangladesh public holidays 2026 (Official Government Announcement)
// Source: Ministry of Public Administration, Bangladesh - Total 28 days off
// Reference: https://www.thedailystar.net/news/bangladesh/news/govt-announces-official-list-public-holidays-2026-4031596
const defaultHolidays2026 = [
    // General Holidays (14 days)
    { date: '2026-02-21', name: 'Shaheed Day & International Mother Language Day', nameBn: 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস', type: 'government', isRecurring: true },
    { date: '2026-03-20', name: 'Jumatul Bida', nameBn: 'জুমাতুল বিদা', type: 'religious' },
    { date: '2026-03-21', name: 'Eid ul-Fitr', nameBn: 'ঈদুল ফিতর', type: 'religious' },
    { date: '2026-03-26', name: 'Independence Day', nameBn: 'স্বাধীনতা ও জাতীয় দিবস', type: 'government', isRecurring: true },
    { date: '2026-05-01', name: 'May Day', nameBn: 'মে দিবস', type: 'government', isRecurring: true },
    { date: '2026-05-01', name: 'Buddha Purnima', nameBn: 'বুদ্ধ পূর্ণিমা', type: 'religious' },
    { date: '2026-05-28', name: 'Eid ul-Adha', nameBn: 'ঈদুল আযহা', type: 'religious' },
    { date: '2026-08-05', name: 'Mass Uprising Day', nameBn: 'গণ-অভ্যুত্থান দিবস', type: 'government' },
    { date: '2026-08-26', name: 'Eid-e-Miladunnabi', nameBn: 'ঈদে মিলাদুন্নবী (সা.)', type: 'religious' },
    { date: '2026-09-04', name: 'Janmashtami', nameBn: 'জন্মাষ্টমী', type: 'religious' },
    { date: '2026-10-21', name: 'Durga Puja (Bijoya Dashami)', nameBn: 'দুর্গাপূজা (বিজয়া দশমী)', type: 'religious' },
    { date: '2026-12-16', name: 'Victory Day', nameBn: 'বিজয় দিবস', type: 'government', isRecurring: true },
    { date: '2026-12-25', name: 'Christmas Day', nameBn: 'বড়দিন', type: 'religious', isRecurring: true },

    // Holidays Under Executive Order (14 days)
    { date: '2026-02-04', name: 'Shab-e-Barat', nameBn: 'শবে বরাত', type: 'religious' },
    { date: '2026-03-17', name: 'Shab-e-Qadr', nameBn: 'শবে কদর', type: 'religious' },
    { date: '2026-03-19', name: 'Eid ul-Fitr Holiday', nameBn: 'ঈদুল ফিতর ছুটি', type: 'religious' },
    { date: '2026-03-22', name: 'Eid ul-Fitr Holiday', nameBn: 'ঈদুল ফিতর ছুটি', type: 'religious' },
    { date: '2026-03-23', name: 'Eid ul-Fitr Holiday', nameBn: 'ঈদুল ফিতর ছুটি', type: 'religious' },
    { date: '2026-04-14', name: 'Bengali New Year (Pahela Baishakh)', nameBn: 'পহেলা বৈশাখ', type: 'government', isRecurring: true },
    { date: '2026-05-26', name: 'Eid ul-Adha Holiday', nameBn: 'ঈদুল আযহা ছুটি', type: 'religious' },
    { date: '2026-05-27', name: 'Eid ul-Adha Holiday', nameBn: 'ঈদুল আযহা ছুটি', type: 'religious' },
    { date: '2026-05-29', name: 'Eid ul-Adha Holiday', nameBn: 'ঈদুল আযহা ছুটি', type: 'religious' },
    { date: '2026-05-30', name: 'Eid ul-Adha Holiday', nameBn: 'ঈদুল আযহা ছুটি', type: 'religious' },
    { date: '2026-05-31', name: 'Eid ul-Adha Holiday', nameBn: 'ঈদুল আযহা ছুটি', type: 'religious' },
    { date: '2026-06-26', name: 'Ashura', nameBn: 'আশুরা', type: 'religious' },
    { date: '2026-10-20', name: 'Durga Puja (Mahanabami)', nameBn: 'দুর্গাপূজা (মহানবমী)', type: 'religious' },
];

// @route   GET /api/holidays/upcoming
// @desc    Get upcoming OFF days (Fridays + Holidays) for next 30 days
// @access  Private
router.get('/upcoming', protect, async (req: AuthRequest, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const today = startOfDayBD();

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + days);

        // Get holidays in the date range
        const holidays = await Holiday.find({
            isActive: true,
            date: { $gte: today, $lte: endDate }
        }).sort({ date: 1 });

        // Generate list of Fridays in the date range
        const offDays: any[] = [];
        const currentDate = new Date(today);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dateStr = formatDateISO(currentDate);

            // Check if it's Friday (5)
            if (dayOfWeek === 5) {
                offDays.push({
                    date: dateStr,
                    type: 'friday',
                    reason: 'শুক্রবার',
                    reasonEn: 'Friday'
                });
            }

            // Check if it's an odd Saturday (1st, 3rd, or 5th Saturday of month)
            if (dayOfWeek === 6) {
                const dayOfMonth = currentDate.getDate();
                const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const firstSaturday = (6 - firstDayOfMonth.getDay() + 7) % 7 + 1;
                const saturdayNumber = Math.ceil((dayOfMonth - firstSaturday + 7) / 7);

                // Odd Saturdays (1st, 3rd, 5th) are OFF in Bangladesh
                if (saturdayNumber === 1 || saturdayNumber === 3 || saturdayNumber === 5) {
                    const saturdayLabel = saturdayNumber === 1 ? '১ম' : saturdayNumber === 3 ? '৩য়' : '৫ম';
                    const saturdaySuffix = saturdayNumber === 1 ? 'st' : saturdayNumber === 3 ? 'rd' : 'th';
                    offDays.push({
                        date: dateStr,
                        type: 'saturday',
                        reason: `বিজোড় শনিবার (${saturdayLabel})`,
                        reasonEn: `Odd Saturday (${saturdayNumber}${saturdaySuffix})`
                    });
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add holidays to the list
        holidays.forEach((holiday: any) => {
            const dateStr = formatDateISO(holiday.date);
            // Check if this date is not already in offDays
            const existingIdx = offDays.findIndex(d => d.date === dateStr);
            if (existingIdx === -1) {
                offDays.push({
                    date: dateStr,
                    type: 'holiday',
                    reason: holiday.nameBn,
                    reasonEn: holiday.name,
                    holidayType: holiday.type
                });
            } else {
                // If already a Friday/Saturday, append holiday info
                offDays[existingIdx].isAlsoHoliday = true;
                offDays[existingIdx].holidayName = holiday.nameBn;
                offDays[existingIdx].holidayNameEn = holiday.name;
            }
        });

        // Sort by date
        offDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.json({
            days,
            count: offDays.length,
            offDays
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/holidays
// @desc    Get holidays for a year/month
// @access  Private
router.get('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { year, month, startDate, endDate } = req.query;

        let query: any = { isActive: true };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        } else if (year) {
            const start = month
                ? new Date(parseInt(year as string), parseInt(month as string) - 1, 1)
                : new Date(parseInt(year as string), 0, 1);
            const end = month
                ? new Date(parseInt(year as string), parseInt(month as string), 0)
                : new Date(parseInt(year as string), 11, 31);

            query.date = { $gte: start, $lte: end };
        }

        const holidays = await Holiday.find(query)
            .populate('addedBy', 'name')
            .sort({ date: 1 });

        res.json(holidays);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/holidays
// @desc    Add a new holiday (Admin+ only)
// @access  Private (Admin+)
router.post('/', protect, isAdmin, [
    body('date').notEmpty().withMessage('তারিখ আবশ্যক'),
    body('name').notEmpty().withMessage('ইংরেজি নাম আবশ্যক'),
    body('nameBn').notEmpty().withMessage('বাংলা নাম আবশ্যক')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, name, nameBn, type, isRecurring } = req.body;
        const holidayDate = new Date(date);

        // Check if holiday already exists
        const existing = await Holiday.findOne({ date: holidayDate });
        if (existing) {
            return res.status(400).json({ message: 'এই তারিখে আগে থেকেই ছুটি আছে' });
        }

        const holiday = await Holiday.create({
            date: holidayDate,
            name,
            nameBn,
            type: type || 'government',
            isRecurring: isRecurring || false,
            recurringMonth: isRecurring ? holidayDate.getMonth() + 1 : undefined,
            recurringDay: isRecurring ? holidayDate.getDate() : undefined,
            addedBy: req.user!._id
        });

        res.status(201).json({
            message: 'ছুটি যোগ করা হয়েছে',
            holiday
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/holidays/:id
// @desc    Update a holiday (Admin+ only)
// @access  Private (Admin+)
router.put('/:id', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const holiday: any = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'ছুটি পাওয়া যায়নি' });
        }

        const { date, name, nameBn, type, isRecurring, isActive } = req.body;

        if (date) holiday.date = new Date(date);
        if (name) holiday.name = name;
        if (nameBn) holiday.nameBn = nameBn;
        if (type) holiday.type = type;
        if (isRecurring !== undefined) {
            holiday.isRecurring = isRecurring;
            if (isRecurring && date) {
                const d = new Date(date);
                holiday.recurringMonth = d.getMonth() + 1;
                holiday.recurringDay = d.getDate();
            }
        }
        if (isActive !== undefined) holiday.isActive = isActive;

        await holiday.save();

        res.json({
            message: 'ছুটি আপডেট করা হয়েছে',
            holiday
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/holidays/:id
// @desc    Delete a holiday (Admin+ only)
// @access  Private (Admin+)
router.delete('/:id', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'ছুটি পাওয়া যায়নি' });
        }

        res.json({ message: 'ছুটি মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/holidays/seed
// @desc    Seed default holidays for 2026 (Admin+ only)
// @access  Private (Admin+)
router.post('/seed', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { year } = req.body;

        // For now, only 2026 data is available
        if (year !== 2026) {
            return res.status(400).json({ message: 'শুধুমাত্র ২০২৬ সালের ছুটির তালিকা আছে' });
        }

        let addedCount = 0;
        for (const h of defaultHolidays2026) {
            const existing = await Holiday.findOne({ date: new Date(h.date) });
            if (!existing) {
                await Holiday.create({
                    ...h,
                    date: new Date(h.date),
                    addedBy: req.user!._id
                });
                addedCount++;
            }
        }

        res.json({ message: `${addedCount}টি ছুটি যোগ করা হয়েছে`, count: addedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/holidays/sync
// @desc    Sync holidays from external API (Admin+ only)
// @access  Private (Admin+)
router.post('/sync', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { year } = req.body;
        const targetYear = year || new Date().getFullYear();

        // Check API availability first
        const isAvailable = await checkApiAvailability();
        if (!isAvailable) {
            return res.status(503).json({
                message: 'Holiday API বর্তমানে অ্যাক্সেসযোগ্য নয়। পরে আবার চেষ্টা করুন।'
            });
        }

        const result = await syncHolidays(targetYear, req.user!._id);

        res.json({
            message: `${targetYear} সালের ছুটি সিঙ্ক সম্পন্ন`,
            year: targetYear,
            added: result.added,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors
        });
    } catch (error: any) {
        console.error('Sync error:', error);
        res.status(500).json({
            message: error.message || 'সিঙ্ক করতে সমস্যা হয়েছে'
        });
    }
});

// @route   GET /api/holidays/preview/:year
// @desc    Preview holidays from API without saving (Admin+ only)
// @access  Private (Admin+)
router.get('/preview/:year', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const year = parseInt(req.params.year);

        if (!year || year < 2020 || year > 2030) {
            return res.status(400).json({
                message: 'বছর ২০২০ থেকে ২০৩০ এর মধ্যে হতে হবে'
            });
        }

        // Check API availability
        const isAvailable = await checkApiAvailability();
        if (!isAvailable) {
            return res.status(503).json({
                message: 'Holiday API বর্তমানে অ্যাক্সেসযোগ্য নয়'
            });
        }

        const holidays = await fetchBangladeshHolidays(year);

        res.json({
            year,
            count: holidays.length,
            holidays: holidays.map((h: any) => ({
                date: h.date,
                name: h.name,
                localName: h.localName,
                types: h.types,
                global: h.global,
                fixed: h.fixed
            }))
        });
    } catch (error: any) {
        console.error('Preview error:', error);
        res.status(500).json({
            message: error.message || 'প্রিভিউ করতে সমস্যা হয়েছে'
        });
    }
});

// @route   GET /api/holidays/api-status
// @desc    Check external API availability
// @access  Private (Admin+)
router.get('/api-status', protect, isAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const isAvailable = await checkApiAvailability();
        res.json({
            available: isAvailable,
            message: isAvailable
                ? 'Holiday API অ্যাক্সেসযোগ্য'
                : 'Holiday API অ্যাক্সেসযোগ্য নয়'
        });
    } catch (error) {
        res.json({
            available: false,
            message: 'API স্ট্যাটাস চেক করতে সমস্যা হয়েছে'
        });
    }
});

export default router;
