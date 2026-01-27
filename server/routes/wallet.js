const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const PDFDocument = require('pdfkit');
const { formatDateISO, formatDateTime, nowBD, toBDTime } = require('../utils/dateUtils');

// @route   GET /api/wallet/balance
// @desc    Get current user's wallet balances
// @access  Private
router.get('/balance', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('balances balanceWarning');

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
router.get('/history/:balanceType', protect, async (req, res) => {
    try {
        const { balanceType } = req.params;
        const { startDate, endDate, limit = 50, page = 1 } = req.query;

        if (!['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
            return res.status(400).json({ message: 'অবৈধ ব্যালেন্স টাইপ' });
        }

        const query = {
            user: req.user._id,
            balanceType: balanceType
        };

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip),
            Transaction.countDocuments(query)
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
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
router.get('/all-history', protect, async (req, res) => {
    try {
        const { startDate, endDate, limit = 50, page = 1 } = req.query;

        const query = { user: req.user._id };

        // Date filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip),
            Transaction.countDocuments(query)
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                limit: parseInt(limit)
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
router.post('/freeze', protect, checkPermission('balance:freeze'), async (req, res) => {
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
        if (user.balances[balanceType].isFrozen) {
            return res.status(400).json({ message: 'এই ব্যালেন্স ইতিমধ্যে ফ্রিজ করা আছে' });
        }

        // Freeze the balance
        user.balances[balanceType].isFrozen = true;
        user.balances[balanceType].frozenAt = new Date();
        user.balances[balanceType].frozenBy = req.user._id;
        user.balances[balanceType].frozenReason = reason || 'কোনো কারণ উল্লেখ করা হয়নি';

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
router.post('/unfreeze', protect, checkPermission('balance:freeze'), async (req, res) => {
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
        if (!user.balances[balanceType].isFrozen) {
            return res.status(400).json({ message: 'এই ব্যালেন্স ফ্রিজ করা নেই' });
        }

        // Unfreeze the balance
        user.balances[balanceType].isFrozen = false;
        user.balances[balanceType].frozenAt = null;
        user.balances[balanceType].frozenBy = null;
        user.balances[balanceType].frozenReason = '';

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
router.post('/update-warning-threshold', protect, async (req, res) => {
    try {
        const { threshold } = req.body;

        if (threshold === undefined || threshold < 0) {
            return res.status(400).json({ message: 'অবৈধ থ্রেশহোল্ড মান' });
        }

        const user = await User.findById(req.user._id);

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
router.get('/statement/pdf', protect, async (req, res) => {
    try {
        const { startDate, endDate, balanceType } = req.query;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'ইউজার পাওয়া যায়নি' });
        }

        // Build transaction query
        const query = { user: req.user._id };

        if (balanceType && ['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
            query.balanceType = balanceType;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query)
            .populate('performedBy', 'name email')
            .sort({ createdAt: 1 });

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=wallet-statement-${Date.now()}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Meal Management System', { align: 'center' });
        doc.fontSize(16).text('Wallet Statement', { align: 'center' });
        doc.moveDown();

        // User Info
        doc.fontSize(12);
        doc.text(`Name: ${user.name}`);
        doc.text(`Email: ${user.email}`);
        doc.text(`Date: ${formatDateTime(nowBD(), 'bn')}`);
        doc.moveDown();

        // Current Balances
        doc.fontSize(14).text('Current Balances:', { underline: true });
        doc.fontSize(12);
        doc.text(`Breakfast: ৳${user.balances.breakfast.amount.toFixed(2)} ${user.balances.breakfast.isFrozen ? '(Frozen)' : ''}`);
        doc.text(`Lunch: ৳${user.balances.lunch.amount.toFixed(2)} ${user.balances.lunch.isFrozen ? '(Frozen)' : ''}`);
        doc.text(`Dinner: ৳${user.balances.dinner.amount.toFixed(2)} ${user.balances.dinner.isFrozen ? '(Frozen)' : ''}`);
        doc.text(`Total: ৳${user.getTotalBalance().toFixed(2)}`, { bold: true });
        doc.moveDown();

        // Transaction History
        doc.fontSize(14).text('Transaction History:', { underline: true });
        doc.moveDown(0.5);

        if (transactions.length === 0) {
            doc.fontSize(12).text('No transactions found for the selected period.');
        } else {
            // Table header
            doc.fontSize(10);
            const tableTop = doc.y;
            const colWidths = {
                date: 80,
                type: 70,
                balance: 60,
                amount: 60,
                prev: 60,
                new: 60,
                desc: 120
            };

            let x = 50;
            doc.text('Date', x, tableTop);
            x += colWidths.date;
            doc.text('Type', x, tableTop);
            x += colWidths.type;
            doc.text('Balance', x, tableTop);
            x += colWidths.balance;
            doc.text('Amount', x, tableTop);
            x += colWidths.amount;
            doc.text('Prev', x, tableTop);
            x += colWidths.prev;
            doc.text('New', x, tableTop);
            x += colWidths.new;
            doc.text('Description', x, tableTop);

            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);

            // Table rows
            transactions.forEach(txn => {
                const y = doc.y;
                x = 50;

                doc.text(formatDateISO(txn.createdAt), x, y, { width: colWidths.date });
                x += colWidths.date;
                doc.text(txn.type, x, y, { width: colWidths.type });
                x += colWidths.type;
                doc.text(txn.balanceType, x, y, { width: colWidths.balance });
                x += colWidths.balance;
                doc.text(`৳${txn.amount.toFixed(2)}`, x, y, { width: colWidths.amount });
                x += colWidths.amount;
                doc.text(`৳${txn.previousBalance.toFixed(2)}`, x, y, { width: colWidths.prev });
                x += colWidths.prev;
                doc.text(`৳${txn.newBalance.toFixed(2)}`, x, y, { width: colWidths.new });
                x += colWidths.new;
                doc.text(txn.description.substring(0, 30), x, y, { width: colWidths.desc });

                doc.moveDown(0.8);

                // Add page break if needed
                if (doc.y > 700) {
                    doc.addPage();
                }
            });
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text('Generated by Meal Management System', { align: 'center', color: 'gray' });
        doc.text(`Generated on: ${formatDateTime(nowBD(), 'bn')}`, { align: 'center', color: 'gray' });

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ message: 'PDF তৈরি করতে ব্যর্থ হয়েছে' });
    }
});

// @route   GET /api/wallet/low-balance-users
// @desc    Get all users with low balance (Admin/Manager only)
// @access  Private (Admin/Manager)
router.get('/low-balance-users', protect, checkPermission('users:view'), async (req, res) => {
    try {
        const users = await User.find({ isActive: true })
            .select('name email balances balanceWarning');

        const lowBalanceUsers = users.filter(user => user.hasLowBalance());

        const result = lowBalanceUsers.map(user => ({
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

module.exports = router;
