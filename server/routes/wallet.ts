import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { protect, checkPermission } from '../middleware/auth';
import User from '../models/User';
import Transaction from '../models/Transaction';
import PDFDocument from 'pdfkit';
import { formatDateISO, formatDateTime, formatDateEn, formatTime, nowBD, toBDTime } from '../utils/dateUtils';
import { AuthRequest } from '../types';

// Bengali font path for PDF generation - try multiple locations
const FONT_PATHS = [
    path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansBengali-Regular.ttf'),
    path.join(process.cwd(), 'server', 'assets', 'fonts', 'NotoSansBengali-Regular.ttf'),
    path.resolve('server', 'assets', 'fonts', 'NotoSansBengali-Regular.ttf')
];

let BENGALI_FONT_PATH = '';
let BENGALI_FONT_EXISTS = false;

for (const fontPath of FONT_PATHS) {
    try {
        // Normalize path for cross-platform compatibility
        const normalizedPath = path.normalize(fontPath);
        if (fs.existsSync(normalizedPath)) {
            BENGALI_FONT_PATH = normalizedPath;
            BENGALI_FONT_EXISTS = true;
            console.log(`[Wallet] Bengali font found at: ${normalizedPath}`);
            break;
        }
    } catch (err) {
        console.error(`[Wallet] Error checking font path ${fontPath}:`, err);
    }
}

if (!BENGALI_FONT_EXISTS) {
    console.warn('[Wallet] Bengali font NOT FOUND - PDF will use English text');
}

const router = express.Router();

// @route   GET /api/wallet/balance
// @desc    Get current user's wallet balances
// @access  Private
router.get('/balance', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id).select('balances balanceWarning');

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check for low balance
        const hasLowBalance = user.hasLowBalance();

        res.json({
            balances: user.balances,
            totalBalance: user.getTotalBalance(),
            balanceWarning: {
                threshold: user.balanceWarning.threshold,
                hasLowBalance: hasLowBalance,
                lastNotifiedAt: user.balanceWarning.lastNotifiedAt
            }
        });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({ message: 'ব্যালেন্স লোড করতে ব্যর্থ হয়েছে' });
    }
});

// @route   GET /api/wallet/history/:balanceType
// @desc    Get wallet transaction history for a specific balance type
// @access  Private
router.get('/history/:balanceType', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { balanceType } = req.params;
        const { startDate, endDate, limit = 50, page = 1 } = req.query;

        if (!['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
            return res.status(400).json({ message: 'অবৈধ ব্যালেন্স টাইপ' });
        }

        const query: any = {
            user: req.user!._id,
            balanceType: balanceType
        };

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit as string))
                .skip(skip),
            Transaction.countDocuments(query)
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page: parseInt(page as string),
                pages: Math.ceil(total / parseInt(limit as string)),
                limit: parseInt(limit as string)
            }
        });
    } catch (error) {
        console.error('Transaction history error:', error);
        res.status(500).json({ message: 'ট্রানজ্যাকশন হিস্টরি লোড করতে ব্যর্থ হয়েছে' });
    }
});

// @route   GET /api/wallet/all-history
// @desc    Get all wallet transaction history (all balance types)
// @access  Private
router.get('/all-history', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate, limit = 50, page = 1 } = req.query;

        const query: any = { user: req.user!._id };

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit as string))
                .skip(skip),
            Transaction.countDocuments(query)
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page: parseInt(page as string),
                pages: Math.ceil(total / parseInt(limit as string)),
                limit: parseInt(limit as string)
            }
        });
    } catch (error) {
        console.error('All transaction history error:', error);
        res.status(500).json({ message: 'ট্রানজ্যাকশন হিস্টরি লোড করতে ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/wallet/freeze
// @desc    Freeze a user's specific balance (Admin/Manager only)
// @access  Private (Admin/Manager)
router.post('/freeze', protect, checkPermission('balance:freeze'), async (req: AuthRequest, res: Response) => {
    try {
        const { userId, balanceType, reason } = req.body;

        if (!userId || !balanceType) {
            return res.status(400).json({ message: 'ইউজার আইডি এবং ব্যালেন্স টাইপ আবশ্যক' });
        }

        if (!['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
            return res.status(400).json({ message: 'অবৈধ ব্যালেন্স টাইপ' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check if already frozen
        if (user.balances[balanceType as keyof typeof user.balances].isFrozen) {
            return res.status(400).json({ message: 'এই ব্যালেন্স ইতিমধ্যে ফ্রিজ করা আছে' });
        }

        // Freeze the balance
        user.balances[balanceType as keyof typeof user.balances].isFrozen = true;
        user.balances[balanceType as keyof typeof user.balances].frozenAt = new Date();
        user.balances[balanceType as keyof typeof user.balances].frozenBy = req.user!._id;
        user.balances[balanceType as keyof typeof user.balances].frozenReason = reason || 'কোনো কারণ উল্লেখ করা হয়নি';

        await user.save();

        res.json({
            message: `${balanceType} ব্যালেন্স সফলভাবে ফ্রিজ করা হয়েছে`,
            balances: user.balances
        });
    } catch (error) {
        console.error('Balance freeze error:', error);
        res.status(500).json({ message: 'ব্যালেন্স ফ্রিজ করতে ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/wallet/unfreeze
// @desc    Unfreeze a user's specific balance (Admin/Manager only)
// @access  Private (Admin/Manager)
router.post('/unfreeze', protect, checkPermission('balance:freeze'), async (req: AuthRequest, res: Response) => {
    try {
        const { userId, balanceType } = req.body;

        if (!userId || !balanceType) {
            return res.status(400).json({ message: 'ইউজার আইডি এবং ব্যালেন্স টাইপ আবশ্যক' });
        }

        if (!['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
            return res.status(400).json({ message: 'অবৈধ ব্যালেন্স টাইপ' });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Check if not frozen
        if (!user.balances[balanceType as keyof typeof user.balances].isFrozen) {
            return res.status(400).json({ message: 'এই ব্যালেন্স ফ্রিজ করা নেই' });
        }

        // Unfreeze the balance
        user.balances[balanceType as keyof typeof user.balances].isFrozen = false;
        user.balances[balanceType as keyof typeof user.balances].frozenAt = null;
        user.balances[balanceType as keyof typeof user.balances].frozenBy = null;
        user.balances[balanceType as keyof typeof user.balances].frozenReason = '';

        await user.save();

        res.json({
            message: `${balanceType} ব্যালেন্স সফলভাবে আনফ্রিজ করা হয়েছে`,
            balances: user.balances
        });
    } catch (error) {
        console.error('Balance unfreeze error:', error);
        res.status(500).json({ message: 'ব্যালেন্স আনফ্রিজ করতে ব্যর্থ হয়েছে' });
    }
});

// @route   POST /api/wallet/update-warning-threshold
// @desc    Update balance warning threshold for current user
// @access  Private
router.post('/update-warning-threshold', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { threshold } = req.body;

        if (threshold === undefined || threshold < 0) {
            return res.status(400).json({ message: 'অবৈধ থ্রেশহোল্ড মান' });
        }

        const user = await User.findById(req.user!._id);

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        user.balanceWarning.threshold = threshold;
        await user.save();

        res.json({
            message: 'ওয়ার্নিং থ্রেশহোল্ড আপডেট করা হয়েছে',
            balanceWarning: user.balanceWarning
        });
    } catch (error) {
        console.error('Warning threshold update error:', error);
        res.status(500).json({ message: 'থ্রেশহোল্ড আপডেট করতে ব্যর্থ হয়েছে' });
    }
});

// @route   GET /api/wallet/statement/pdf
// @desc    Generate and download PDF wallet statement
// @access  Private
router.get('/statement/pdf', protect, async (req: AuthRequest, res: Response) => {
    console.log('[Wallet PDF] Starting PDF generation for user:', req.user?._id);
    try {
        const { startDate, endDate, balanceType } = req.query;
        console.log('[Wallet PDF] Query params:', { startDate, endDate, balanceType });

        const user = await User.findById(req.user!._id);
        console.log('[Wallet PDF] User found:', user ? 'yes' : 'no');

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Build transaction query
        const query: any = { user: req.user!._id };

        if (balanceType && ['breakfast', 'lunch', 'dinner'].includes(balanceType as string)) {
            query.balanceType = balanceType;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const transactions = await Transaction.find(query)
            .populate('performedBy', 'name email')
            .sort({ createdAt: 1 });

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        // Handle PDF stream errors
        doc.on('error', (pdfError) => {
            console.error('[Wallet PDF] Stream error:', pdfError);
            if (!res.headersSent) {
                res.status(500).json({ message: 'PDF স্ট্রিম ত্রুটি' });
            }
        });

        // Register Bengali font if available
        let useBengaliFont = false;
        if (BENGALI_FONT_EXISTS) {
            try {
                doc.registerFont('Bengali', BENGALI_FONT_PATH);
                doc.font('Bengali');
                useBengaliFont = true;
                console.log('[Wallet PDF] Bengali font registered successfully');
            } catch (fontError) {
                console.error('[Wallet PDF] Bengali font registration error:', fontError);
                useBengaliFont = false;
            }
        } else {
            console.log('[Wallet PDF] Bengali font not available, using default font');
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=wallet-statement-${Date.now()}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Header
        doc.fontSize(20).text(useBengaliFont ? 'মিল ম্যানেজমেন্ট সিস্টেম' : 'Meal Management System', { align: 'center' });
        doc.fontSize(16).text(useBengaliFont ? 'ওয়ালেট স্টেটমেন্ট' : 'Wallet Statement', { align: 'center' });
        doc.moveDown();

        // User Info
        doc.fontSize(12);
        doc.text(`${useBengaliFont ? 'নাম' : 'Name'}: ${user.name}`);
        doc.text(`${useBengaliFont ? 'ইমেইল' : 'Email'}: ${user.email}`);
        doc.text(`${useBengaliFont ? 'তারিখ' : 'Date'}: ${formatDateEn(nowBD())}, ${formatTime(nowBD())}`);
        doc.moveDown();

        // Current Balances - with safe defaults
        const breakfastAmount = user.balances?.breakfast?.amount ?? 0;
        const lunchAmount = user.balances?.lunch?.amount ?? 0;
        const dinnerAmount = user.balances?.dinner?.amount ?? 0;
        const totalBalance = breakfastAmount + lunchAmount + dinnerAmount;

        doc.fontSize(14).text(useBengaliFont ? 'বর্তমান ব্যালেন্স:' : 'Current Balances:', { underline: true });
        doc.fontSize(12);
        doc.text(`${useBengaliFont ? 'নাস্তা' : 'Breakfast'}: ${useBengaliFont ? '৳' : 'BDT '}${breakfastAmount.toFixed(2)} ${user.balances?.breakfast?.isFrozen ? (useBengaliFont ? '(ফ্রিজ)' : '(Frozen)') : ''}`);
        doc.text(`${useBengaliFont ? 'দুপুর' : 'Lunch'}: ${useBengaliFont ? '৳' : 'BDT '}${lunchAmount.toFixed(2)} ${user.balances?.lunch?.isFrozen ? (useBengaliFont ? '(ফ্রিজ)' : '(Frozen)') : ''}`);
        doc.text(`${useBengaliFont ? 'রাত' : 'Dinner'}: ${useBengaliFont ? '৳' : 'BDT '}${dinnerAmount.toFixed(2)} ${user.balances?.dinner?.isFrozen ? (useBengaliFont ? '(ফ্রিজ)' : '(Frozen)') : ''}`);
        doc.text(`${useBengaliFont ? 'মোট' : 'Total'}: ${useBengaliFont ? '৳' : 'BDT '}${totalBalance.toFixed(2)}`, { bold: true } as any);
        doc.moveDown();

        // Transaction History
        doc.fontSize(14).text(useBengaliFont ? 'লেনদেনের ইতিহাস:' : 'Transaction History:', { underline: true });
        doc.moveDown(0.5);

        if (transactions.length === 0) {
            doc.fontSize(12).text(useBengaliFont ? 'নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি।' : 'No transactions found for the selected period.');
        } else {
            // Table header
            doc.fontSize(10);
            const tableTop = doc.y;
            const colWidths = {
                date: 80,
                type: 60,
                balance: 55,
                amount: 55,
                prev: 55,
                new: 55,
                desc: 140
            };

            let x = 50;
            doc.text(useBengaliFont ? 'তারিখ' : 'Date', x, tableTop);
            x += colWidths.date;
            doc.text(useBengaliFont ? 'টাইপ' : 'Type', x, tableTop);
            x += colWidths.type;
            doc.text(useBengaliFont ? 'ব্যালেন্স' : 'Balance', x, tableTop);
            x += colWidths.balance;
            doc.text(useBengaliFont ? 'পরিমাণ' : 'Amount', x, tableTop);
            x += colWidths.amount;
            doc.text(useBengaliFont ? 'পূর্বের' : 'Prev', x, tableTop);
            x += colWidths.prev;
            doc.text(useBengaliFont ? 'নতুন' : 'New', x, tableTop);
            x += colWidths.new;
            doc.text(useBengaliFont ? 'বিবরণ' : 'Description', x, tableTop);

            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            // Transaction type mapping
            const typeMapBn: Record<string, string> = {
                deposit: useBengaliFont ? 'জমা' : 'Deposit',
                deduction: useBengaliFont ? 'কর্তন' : 'Deduction',
                adjustment: useBengaliFont ? 'সমন্বয়' : 'Adjustment',
                refund: useBengaliFont ? 'ফেরত' : 'Refund'
            };

            // Balance type mapping
            const balanceTypeMapBn: Record<string, string> = {
                breakfast: useBengaliFont ? 'নাস্তা' : 'Breakfast',
                lunch: useBengaliFont ? 'দুপুর' : 'Lunch',
                dinner: useBengaliFont ? 'রাত' : 'Dinner'
            };

            const currencySymbol = useBengaliFont ? '৳' : 'BDT ';

            // Table rows
            transactions.forEach((txn: any) => {
                const y = doc.y;
                x = 50;

                // Safe access to transaction fields
                const txnAmount = txn.amount ?? 0;
                const txnPrevBalance = txn.previousBalance ?? 0;
                const txnNewBalance = txn.newBalance ?? 0;
                const txnDescription = txn.description || '';

                doc.text(formatDateISO(txn.createdAt), x, y, { width: colWidths.date });
                x += colWidths.date;
                doc.text(typeMapBn[txn.type] || txn.type || '-', x, y, { width: colWidths.type });
                x += colWidths.type;
                doc.text(balanceTypeMapBn[txn.balanceType] || txn.balanceType || '-', x, y, { width: colWidths.balance });
                x += colWidths.balance;
                doc.text(`${currencySymbol}${txnAmount.toFixed(2)}`, x, y, { width: colWidths.amount });
                x += colWidths.amount;
                doc.text(`${currencySymbol}${txnPrevBalance.toFixed(2)}`, x, y, { width: colWidths.prev });
                x += colWidths.prev;
                doc.text(`${currencySymbol}${txnNewBalance.toFixed(2)}`, x, y, { width: colWidths.new });
                x += colWidths.new;
                doc.text(txnDescription.substring(0, 40), x, y, { width: colWidths.desc });

                doc.moveDown(0.8);

                // Add page break if needed
                if (doc.y > 700) {
                    doc.addPage();
                }
            });
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text(useBengaliFont ? 'মিল ম্যানেজমেন্ট সিস্টেম দ্বারা তৈরি' : 'Generated by Meal Management System', { align: 'center', color: 'gray' } as any);
        doc.text(`${useBengaliFont ? 'তৈরির সময়' : 'Generated on'}: ${formatDateEn(nowBD())}, ${formatTime(nowBD())}`, { align: 'center', color: 'gray' } as any);

        // Finalize PDF
        doc.end();
    } catch (error: any) {
        console.error('[Wallet PDF] Generation error:', error);
        console.error('[Wallet PDF] Error stack:', error?.stack);
        if (!res.headersSent) {
            res.status(500).json({
                message: 'PDF তৈরি করতে ব্যর্থ হয়েছে',
                error: process.env.NODE_ENV === 'development' ? error?.message : undefined
            });
        }
    }
});

// @route   GET /api/wallet/low-balance-users
// @desc    Get all users with low balance (Admin/Manager only)
// @access  Private (Admin/Manager)
router.get('/low-balance-users', protect, checkPermission('users:view'), async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find({ isActive: true })
            .select('name email balances balanceWarning');

        const lowBalanceUsers = users.filter((user: any) => user.hasLowBalance());

        const result = lowBalanceUsers.map((user: any) => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            balances: user.balances,
            threshold: user.balanceWarning.threshold,
            lowBalances: {
                breakfast: user.balances.breakfast.amount < user.balanceWarning.threshold,
                lunch: user.balances.lunch.amount < user.balanceWarning.threshold,
                dinner: user.balances.dinner.amount < user.balanceWarning.threshold
            }
        }));

        res.json({
            count: result.length,
            users: result
        });
    } catch (error) {
        console.error('Low balance users fetch error:', error);
        res.status(500).json({ message: 'লো ব্যালেন্স ইউজার লোড করতে ব্যর্থ হয়েছে' });
    }
});

export default router;
