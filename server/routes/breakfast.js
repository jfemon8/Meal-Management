const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Breakfast = require('../models/Breakfast');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, isManager } = require('../middleware/auth');
const { formatDate } = require('../utils/dateUtils');

// @route   GET /api/breakfast
// @desc    Get breakfast records for a date range
// @access  Private (Manager+)
router.get('/', protect, isManager, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const breakfasts = await Breakfast.find(query)
            .populate('participants.user', 'name email')
            .populate('submittedBy', 'name email')
            .sort({ date: -1 });

        res.json(breakfasts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/breakfast/user
// @desc    Get breakfast records for current user
// @access  Private
router.get('/user', protect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const query = {
            'participants.user': req.user._id
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const breakfasts = await Breakfast.find(query)
            .populate('submittedBy', 'name')
            .sort({ date: -1 });

        // Filter to only show user's participation
        const userBreakfasts = breakfasts.map(b => {
            const userParticipation = b.participants.find(
                p => p.user.toString() === req.user._id.toString()
            );
            return {
                _id: b._id,
                date: b.date,
                description: b.description,
                totalCost: b.totalCost,
                myCost: userParticipation ? userParticipation.cost : 0,
                deducted: userParticipation ? userParticipation.deducted : false,
                submittedBy: b.submittedBy
            };
        });

        res.json(userBreakfasts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/breakfast
// @desc    Submit daily breakfast cost (Manager+ only)
// @access  Private (Manager+)
router.post('/', protect, isManager, [
    body('date').notEmpty().withMessage('তারিখ আবশ্যক'),
    body('totalCost').isNumeric().withMessage('মোট খরচ সংখ্যা হতে হবে'),
    body('participants').isArray().withMessage('অংশগ্রহণকারীদের তালিকা আবশ্যক')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, totalCost, description, participants } = req.body;
        const breakfastDate = new Date(date);

        // Check if breakfast already exists for this date
        const existingBreakfast = await Breakfast.findOne({ date: breakfastDate });
        if (existingBreakfast) {
            return res.status(400).json({ message: 'এই তারিখের নাস্তার খরচ আগেই জমা দেওয়া হয়েছে' });
        }

        // Calculate per-person cost
        const participantCount = participants.length;
        if (participantCount === 0) {
            return res.status(400).json({ message: 'কমপক্ষে একজন অংশগ্রহণকারী থাকতে হবে' });
        }

        const perPersonCost = totalCost / participantCount;

        // Create participant entries
        const participantEntries = participants.map(userId => ({
            user: userId,
            cost: perPersonCost,
            deducted: false
        }));

        // Create breakfast record
        const breakfast = await Breakfast.create({
            date: breakfastDate,
            totalCost,
            description,
            participants: participantEntries,
            submittedBy: req.user._id
        });

        res.status(201).json({
            message: 'নাস্তার খরচ সফলভাবে জমা হয়েছে',
            breakfast
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/breakfast/:id/deduct
// @desc    Deduct breakfast cost from all participants (Manager+ only)
// @access  Private (Manager+)
router.post('/:id/deduct', protect, isManager, async (req, res) => {
    try {
        const breakfast = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তার রেকর্ড পাওয়া যায়নি' });
        }

        if (breakfast.isFinalized) {
            return res.status(400).json({ message: 'এই নাস্তার খরচ আগেই কাটা হয়েছে' });
        }

        const deductionResults = [];

        // Deduct from each participant
        for (const participant of breakfast.participants) {
            if (participant.deducted) continue;

            const user = await User.findById(participant.user);
            if (!user) continue;

            const previousBalance = user.balances.breakfast;
            const newBalance = previousBalance - participant.cost;

            user.balances.breakfast = newBalance;
            await user.save();

            // Create transaction record
            await Transaction.create({
                user: user._id,
                type: 'deduction',
                balanceType: 'breakfast',
                amount: -participant.cost,
                previousBalance,
                newBalance,
                description: `নাস্তার খরচ - ${formatDate(breakfast.date)}`,
                reference: breakfast._id,
                referenceModel: 'Breakfast',
                performedBy: req.user._id
            });

            // Update participant as deducted
            participant.deducted = true;
            participant.deductedAt = new Date();

            deductionResults.push({
                user: user.name,
                cost: participant.cost,
                newBalance
            });
        }

        breakfast.isFinalized = true;
        await breakfast.save();

        res.json({
            message: 'নাস্তার খরচ সফলভাবে কাটা হয়েছে',
            deductions: deductionResults
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   PUT /api/breakfast/:id
// @desc    Update breakfast record (Manager+ only)
// @access  Private (Manager+)
router.put('/:id', protect, isManager, async (req, res) => {
    try {
        const breakfast = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তার রেকর্ড পাওয়া যায়নি' });
        }

        if (breakfast.isFinalized) {
            return res.status(400).json({ message: 'ফাইনালাইজড রেকর্ড এডিট করা যাবে না' });
        }

        const { totalCost, description, participants } = req.body;

        if (totalCost !== undefined && participants) {
            const perPersonCost = totalCost / participants.length;
            breakfast.totalCost = totalCost;
            breakfast.participants = participants.map(userId => ({
                user: userId,
                cost: perPersonCost,
                deducted: false
            }));
        }

        if (description !== undefined) {
            breakfast.description = description;
        }

        await breakfast.save();

        res.json({
            message: 'নাস্তার রেকর্ড আপডেট হয়েছে',
            breakfast
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/breakfast/:id
// @desc    Delete breakfast record (Manager+ only)
// @access  Private (Manager+)
router.delete('/:id', protect, isManager, async (req, res) => {
    try {
        const breakfast = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তার রেকর্ড পাওয়া যায়নি' });
        }

        if (breakfast.isFinalized) {
            return res.status(400).json({ message: 'ফাইনালাইজড রেকর্ড ডিলিট করা যাবে না' });
        }

        await Breakfast.findByIdAndDelete(req.params.id);

        res.json({ message: 'নাস্তার রেকর্ড ডিলিট হয়েছে' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

module.exports = router;
