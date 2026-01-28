import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest, AuthMiddleware, UserRole } from '../types';

// Protect routes - require authentication
const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as { id: string };
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401).json({ message: 'ইউজার পাওয়া যায়নি' });
                return;
            }

            if (!req.user.isActive) {
                res.status(401).json({ message: 'আপনার একাউন্ট নিষ্ক্রিয় করা হয়েছে' });
                return;
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
const authorize = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!roles.includes(req.user!.role)) {
            res.status(403).json({
                message: `${req.user!.role} রোল এই কাজের জন্য অনুমোদিত নয়`
            });
            return;
        }
        next();
    };
};

// Check if user is at least manager
const isManager: AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!(['manager', 'admin', 'superadmin'] as UserRole[]).includes(req.user!.role)) {
        res.status(403).json({ message: 'শুধুমাত্র ম্যানেজার বা তার উপরের রোল এই কাজ করতে পারবে' });
        return;
    }
    next();
};

// Check if user is at least admin
const isAdmin: AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!(['admin', 'superadmin'] as UserRole[]).includes(req.user!.role)) {
        res.status(403).json({ message: 'শুধুমাত্র এডমিন বা সুপার এডমিন এই কাজ করতে পারবে' });
        return;
    }
    next();
};

// Check if user is superadmin
const isSuperAdmin: AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user!.role !== 'superadmin') {
        res.status(403).json({ message: 'শুধুমাত্র সুপার এডমিন এই কাজ করতে পারবে' });
        return;
    }
    next();
};

// Check if user has a specific permission
const checkPermission = (permission: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'অনুমোদন ব্যর্থ' });
                return;
            }

            // Check if user has the permission (role-based or custom)
            const hasPermission = req.user.hasPermission(permission);

            if (!hasPermission) {
                res.status(403).json({
                    message: 'এই কাজের জন্য আপনার অনুমতি নেই'
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'অনুমতি যাচাই করতে ব্যর্থ হয়েছে' });
            return;
        }
    };
};

export { protect, authorize, isManager, isAdmin, isSuperAdmin, checkPermission };
