import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Breakfast from '../models/Breakfast';
import User from '../models/User';
import Transaction from '../models/Transaction';
import GlobalSettings from '../models/GlobalSettings';
import { protect, isManager } from '../middleware/auth';
import { formatDateISO, formatDateBn, formatDateTime, nowBD, toBDTime, startOfDayBD, formatDate } from '../utils/dateUtils';
import { AuthRequest } from '../types';

const router = express.Router();

/**
 * Helper function to deduct breakfast cost from participants
 */
const deductBreakfastCost = async (breakfast: any, performedBy: any) => {
    const deductionResults: any[] = [];

    for (const participant of breakfast.participants) {
        if (participant.deducted) continue;

        const user = await User.findById(participant.user);
        if (!user) continue;

        // Check if balance is frozen
        if (user.balances.breakfast.isFrozen) {
            deductionResults.push({
                user: user.name,
                cost: participant.cost,
                error: 'Balance is frozen'
            });
            continue;
        }

        const previousBalance = user.balances.breakfast.amount;
        const newBalance = previousBalance - participant.cost;

        user.balances.breakfast.amount = newBalance;
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
            performedBy: performedBy._id
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

    return deductionResults;
};

// @route   GET /api/breakfast/settings
// @desc    Get breakfast policy settings
// @access  Private (Manager+)
router.get('/settings', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const settings = await GlobalSettings.getSettings();
        const breakfastPolicy = (settings as any).breakfastPolicy || {
            autoDeduct: true,
            requireConfirmation: false
        };

        res.json({
            autoDeduct: breakfastPolicy.autoDeduct,
            requireConfirmation: breakfastPolicy.requireConfirmation
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   GET /api/breakfast
// @desc    Get breakfast records for a date range
// @access  Private (Manager+)
router.get('/', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const query: any = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
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
router.get('/user', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        const query: any = {
            'participants.user': req.user!._id
        };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        const breakfasts = await Breakfast.find(query)
            .populate('submittedBy', 'name')
            .sort({ date: -1 });

        // Filter to only show user's participation
        const userBreakfasts = breakfasts.map((b: any) => {
            const userParticipation = b.participants.find(
                (p: any) => p.user.toString() === req.user!._id.toString()
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
    body('date').notEmpty().withMessage('তারিখ আবশ্যক')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, totalCost, description, participants, participantCosts, skipAutoDeduct } = req.body;
        const breakfastDate = new Date(date);

        // Check if breakfast already exists for this date
        const existingBreakfast = await Breakfast.findOne({ date: breakfastDate });
        if (existingBreakfast) {
            return res.status(400).json({ message: 'এই তারিখের নাস্তার খরচ আগেই জমা দেওয়া হয়েছে' });
        }

        let participantEntries: any[] = [];
        let calculatedTotalCost = 0;

        // Mode 2: Individual costs per user
        if (participantCosts && Array.isArray(participantCosts) && participantCosts.length > 0) {
            participantEntries = participantCosts.map((p: any) => ({
                user: p.userId,
                cost: parseFloat(p.cost) || 0,
                deducted: false
            }));
            calculatedTotalCost = participantEntries.reduce((sum: number, p: any) => sum + p.cost, 0);
        }
        // Mode 1: Equal split
        else if (participants && Array.isArray(participants) && participants.length > 0) {
            if (!totalCost || isNaN(totalCost)) {
                return res.status(400).json({ message: 'মোট খরচ প্রদান করুন' });
            }
            const participantCount = participants.length;
            const perPersonCost = parseFloat(totalCost) / participantCount;
            participantEntries = participants.map((userId: any) => ({
                user: userId,
                cost: perPersonCost,
                deducted: false
            }));
            calculatedTotalCost = parseFloat(totalCost);
        } else {
            return res.status(400).json({ message: 'কমপক্ষে একজন অংশগ্রহণকারী থাকতে হবে' });
        }

        // Create breakfast record
        const breakfast = await Breakfast.create({
            date: breakfastDate,
            totalCost: calculatedTotalCost,
            description,
            participants: participantEntries,
            submittedBy: req.user!._id
        });

        // Check auto-deduction settings
        const settings = await GlobalSettings.getSettings();
        const breakfastPolicy = (settings as any).breakfastPolicy || { autoDeduct: true, requireConfirmation: false };

        let deductionResults: any = null;
        let autoDeducted = false;

        // Auto-deduct if enabled and not skipped by request
        if (breakfastPolicy.autoDeduct && !skipAutoDeduct && !breakfastPolicy.requireConfirmation) {
            deductionResults = await deductBreakfastCost(breakfast, req.user);
            breakfast.isFinalized = true;
            await breakfast.save();
            autoDeducted = true;
        }

        res.status(201).json({
            message: autoDeducted
                ? 'নাস্তার খরচ সফলভাবে জমা ও ওয়ালেট থেকে কাটা হয়েছে'
                : 'নাস্তার খরচ সফলভাবে জমা হয়েছে',
            breakfast,
            autoDeducted,
            deductions: deductionResults,
            settings: {
                autoDeduct: breakfastPolicy.autoDeduct,
                requireConfirmation: breakfastPolicy.requireConfirmation
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   POST /api/breakfast/:id/deduct
// @desc    Deduct breakfast cost from all participants (Manager+ only)
// @access  Private (Manager+)
router.post('/:id/deduct', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const breakfast = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তার রেকর্ড পাওয়া যায়নি' });
        }

        if (breakfast.isFinalized) {
            return res.status(400).json({ message: 'এই নাস্তার খরচ আগেই কাটা হয়েছে' });
        }

        // Use helper function for deduction
        const deductionResults = await deductBreakfastCost(breakfast, req.user);

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
router.put('/:id', protect, isManager, async (req: AuthRequest, res: Response) => {
    try {
        const breakfast: any = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তার রেকর্ড পাওয়া যায়নি' });
        }

        if (breakfast.isFinalized) {
            return res.status(400).json({ message: 'ফাইনালাইজড রেকর্ড এডিট করা যাবে না' });
        }

        const { totalCost, description, participants, participantCosts } = req.body;

        // Mode 2: Individual costs per user
        if (participantCosts && Array.isArray(participantCosts) && participantCosts.length > 0) {
            breakfast.participants = participantCosts.map((p: any) => ({
                user: p.userId,
                cost: parseFloat(p.cost) || 0,
                deducted: false
            }));
            breakfast.totalCost = breakfast.participants.reduce((sum: number, p: any) => sum + p.cost, 0);
        }
        // Mode 1: Equal split
        else if (totalCost !== undefined && participants) {
            const perPersonCost = totalCost / participants.length;
            breakfast.totalCost = totalCost;
            breakfast.participants = participants.map((userId: any) => ({
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

// @route   POST /api/breakfast/:id/reverse
// @desc    Reverse a finalized breakfast entry (refund all participants)
// @access  Private (Manager+)
router.post('/:id/reverse', protect, isManager, [
    body('reason').notEmpty().withMessage('রিভার্সের কারণ আবশ্যক')
], async (req: AuthRequest, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const breakfast: any = await Breakfast.findById(req.params.id);
        if (!breakfast) {
            return res.status(404).json({ message: 'নাস্তার রেকর্ড পাওয়া যায়নি' });
        }

        if (!breakfast.isFinalized) {
            return res.status(400).json({ message: 'শুধুমাত্র ফাইনালাইজড রেকর্ড রিভার্স করা যাবে' });
        }

        if (breakfast.isReversed) {
            return res.status(400).json({ message: 'এই রেকর্ড আগেই রিভার্স করা হয়েছে' });
        }

        const { reason } = req.body;
        const refundResults: any[] = [];

        // Refund each participant who was deducted
        for (const participant of breakfast.participants) {
            if (!participant.deducted) continue;

            const user = await User.findById(participant.user);
            if (!user) continue;

            const previousBalance = user.balances.breakfast.amount;
            const newBalance = previousBalance + participant.cost;

            user.balances.breakfast.amount = newBalance;
            await user.save();

            // Create refund transaction record
            await Transaction.create({
                user: user._id,
                type: 'refund',
                balanceType: 'breakfast',
                amount: participant.cost,
                previousBalance,
                newBalance,
                description: `নাস্তা রিফান্ড - ${formatDate(breakfast.date)} (${reason})`,
                reference: breakfast._id,
                referenceModel: 'Breakfast',
                performedBy: req.user!._id
            });

            refundResults.push({
                user: user.name,
                refundAmount: participant.cost,
                newBalance
            });
        }

        // Mark breakfast as reversed
        breakfast.isReversed = true;
        breakfast.reversedAt = new Date();
        breakfast.reversedBy = req.user!._id;
        breakfast.reverseReason = reason;
        await breakfast.save();

        res.json({
            message: 'নাস্তার খরচ সফলভাবে রিভার্স (রিফান্ড) হয়েছে',
            reason,
            refunds: refundResults
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'সার্ভার এরর' });
    }
});

// @route   DELETE /api/breakfast/:id
// @desc    Delete breakfast record (Manager+ only)
// @access  Private (Manager+)
router.delete('/:id', protect, isManager, async (req: AuthRequest, res: Response) => {
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

export default router;
