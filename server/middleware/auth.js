const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'ইউজার পাওয়া যায়নি' });
            }

            if (!req.user.isActive) {
                return res.status(401).json({ message: 'আপনার একাউন্ট নিষ্ক্রিয় করা হয়েছে' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'অনুমোদন ব্যর্থ, টোকেন অবৈধ' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'অনুমোদন ব্যর্থ, কোন টোকেন নেই' });
    }
};

// Role-based authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `${req.user.role} রোল এই কাজের জন্য অনুমোদিত নয়`
            });
        }
        next();
    };
};

// Check if user is at least manager
const isManager = (req, res, next) => {
    if (!['manager', 'admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'শুধুমাত্র ম্যানেজার বা তার উপরের রোল এই কাজ করতে পারবে' });
    }
    next();
};

// Check if user is at least admin
const isAdmin = (req, res, next) => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ message: 'শুধুমাত্র এডমিন বা সুপার এডমিন এই কাজ করতে পারবে' });
    }
    next();
};

// Check if user is superadmin
const isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন এই কাজ করতে পারবে' });
    }
    next();
};

// Check if user has a specific permission
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'অনুমোদন ব্যর্থ' });
            }

            // Check if user has the permission (role-based or custom)
            const hasPermission = req.user.hasPermission(permission);

            if (!hasPermission) {
                return res.status(403).json({
                    message: 'এই কাজের জন্য আপনার অনুমতি নেই'
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ message: 'অনুমতি যাচাই করতে ব্যর্থ হয়েছে' });
        }
    };
};

module.exports = { protect, authorize, isManager, isAdmin, isSuperAdmin, checkPermission };
