const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { protect, isSuperAdmin } = require('../middleware/auth');

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get all models for backup
const getModels = () => {
    return {
        User: require('../models/User'),
        Meal: require('../models/Meal'),
        Breakfast: require('../models/Breakfast'),
        Transaction: require('../models/Transaction'),
        MonthSettings: require('../models/MonthSettings'),
        Holiday: require('../models/Holiday'),
        Group: require('../models/Group'),
        GlobalSettings: require('../models/GlobalSettings'),
        AuditLog: require('../models/AuditLog'),
        Notification: require('../models/Notification')
    };
};

// @route   GET /api/backup
// @desc    Get list of available backups
// @access  Private (SuperAdmin)
router.get('/', protect, isSuperAdmin, async (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                return {
                    filename: file,
                    createdAt: stats.birthtime,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    collections: content.metadata?.collections || {},
                    createdBy: content.metadata?.createdBy || 'Unknown'
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            backups: files,
            backupDir: BACKUP_DIR,
            totalBackups: files.length
        });
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ message: 'ব্যাকআপ তালিকা লোড করতে সমস্যা হয়েছে' });
    }
});

// @route   POST /api/backup
// @desc    Create a new backup
// @access  Private (SuperAdmin)
router.post('/', protect, isSuperAdmin, async (req, res) => {
    try {
        const models = getModels();
        const backup = {
            metadata: {
                createdAt: new Date(),
                createdBy: req.user.name,
                createdById: req.user._id,
                version: '1.0',
                collections: {}
            },
            data: {}
        };

        // Export each collection
        for (const [name, Model] of Object.entries(models)) {
            try {
                const documents = await Model.find({}).lean();
                backup.data[name] = documents;
                backup.metadata.collections[name] = documents.length;
            } catch (err) {
                console.error(`Error backing up ${name}:`, err);
                backup.data[name] = [];
                backup.metadata.collections[name] = 0;
            }
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.json`;
        const filePath = path.join(BACKUP_DIR, filename);

        // Write backup file
        fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));

        const stats = fs.statSync(filePath);

        res.json({
            message: 'ব্যাকআপ সফলভাবে তৈরি হয়েছে',
            backup: {
                filename,
                createdAt: new Date(),
                size: stats.size,
                sizeFormatted: formatBytes(stats.size),
                collections: backup.metadata.collections
            }
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ message: 'ব্যাকআপ তৈরি করতে সমস্যা হয়েছে' });
    }
});

// @route   GET /api/backup/:filename
// @desc    Download a specific backup
// @access  Private (SuperAdmin)
router.get('/:filename', protect, isSuperAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);

        // Security check - prevent directory traversal
        if (!filename.endsWith('.json') || filename.includes('..')) {
            return res.status(400).json({ message: 'অবৈধ ফাইলনাম' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'ব্যাকআপ ফাইল পাওয়া যায়নি' });
        }

        res.download(filePath, filename);
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ message: 'ব্যাকআপ ডাউনলোড করতে সমস্যা হয়েছে' });
    }
});

// @route   DELETE /api/backup/:filename
// @desc    Delete a specific backup
// @access  Private (SuperAdmin)
router.delete('/:filename', protect, isSuperAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(BACKUP_DIR, filename);

        // Security check
        if (!filename.endsWith('.json') || filename.includes('..')) {
            return res.status(400).json({ message: 'অবৈধ ফাইলনাম' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'ব্যাকআপ ফাইল পাওয়া যায়নি' });
        }

        fs.unlinkSync(filePath);

        res.json({ message: 'ব্যাকআপ সফলভাবে মুছে ফেলা হয়েছে' });
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ message: 'ব্যাকআপ মুছতে সমস্যা হয়েছে' });
    }
});

// @route   POST /api/backup/restore/:filename
// @desc    Restore from a backup (DANGEROUS - use with caution)
// @access  Private (SuperAdmin)
router.post('/restore/:filename', protect, isSuperAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const { confirmRestore } = req.body;

        if (confirmRestore !== 'RESTORE_DATABASE') {
            return res.status(400).json({
                message: 'রিস্টোর নিশ্চিত করতে "RESTORE_DATABASE" পাঠান'
            });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        // Security check
        if (!filename.endsWith('.json') || filename.includes('..')) {
            return res.status(400).json({ message: 'অবৈধ ফাইলনাম' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'ব্যাকআপ ফাইল পাওয়া যায়নি' });
        }

        // Read backup file
        const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const models = getModels();
        const restoreResults = {};

        // Create a pre-restore backup first
        const preRestoreBackup = {
            metadata: {
                createdAt: new Date(),
                createdBy: 'System (Pre-Restore)',
                type: 'pre-restore',
                originalBackup: filename
            },
            data: {}
        };

        for (const [name, Model] of Object.entries(models)) {
            preRestoreBackup.data[name] = await Model.find({}).lean();
        }

        const preRestoreFilename = `pre_restore_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(path.join(BACKUP_DIR, preRestoreFilename), JSON.stringify(preRestoreBackup, null, 2));

        // Restore each collection
        for (const [name, Model] of Object.entries(models)) {
            try {
                if (backup.data[name] && Array.isArray(backup.data[name])) {
                    // Clear existing data
                    await Model.deleteMany({});

                    // Insert backup data
                    if (backup.data[name].length > 0) {
                        await Model.insertMany(backup.data[name], { ordered: false });
                    }

                    restoreResults[name] = {
                        success: true,
                        count: backup.data[name].length
                    };
                }
            } catch (err) {
                console.error(`Error restoring ${name}:`, err);
                restoreResults[name] = {
                    success: false,
                    error: err.message
                };
            }
        }

        res.json({
            message: 'ডেটাবেস সফলভাবে রিস্টোর হয়েছে',
            preRestoreBackup: preRestoreFilename,
            results: restoreResults
        });
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({ message: 'রিস্টোর করতে সমস্যা হয়েছে' });
    }
});

// @route   DELETE /api/backup/cleanup/old
// @desc    Delete backups older than specified days
// @access  Private (SuperAdmin)
router.delete('/cleanup/old', protect, isSuperAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.json'));

        let deletedCount = 0;
        const deletedFiles = [];

        for (const file of files) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);

            if (stats.birthtime < cutoffDate) {
                fs.unlinkSync(filePath);
                deletedCount++;
                deletedFiles.push(file);
            }
        }

        res.json({
            message: `${deletedCount} টি পুরাতন ব্যাকআপ মুছে ফেলা হয়েছে`,
            deletedFiles,
            cutoffDate
        });
    } catch (error) {
        console.error('Error cleaning up backups:', error);
        res.status(500).json({ message: 'ব্যাকআপ ক্লিনআপ করতে সমস্যা হয়েছে' });
    }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
