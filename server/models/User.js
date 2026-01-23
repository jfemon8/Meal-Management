const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'নাম আবশ্যক'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'ইমেইল আবশ্যক'],
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'পাসওয়ার্ড আবশ্যক'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'manager', 'admin', 'superadmin'],
        default: 'user'
    },
    // Custom permissions array for specific user permissions (optional)
    // These are in addition to role-based permissions
    permissions: {
        type: [String],
        default: []
    },
    // Separate balances for different meal types
    balances: {
        breakfast: {
            amount: {
                type: Number,
                default: 0
            },
            isFrozen: {
                type: Boolean,
                default: false
            },
            frozenAt: {
                type: Date,
                default: null
            },
            frozenBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            },
            frozenReason: {
                type: String,
                default: ''
            }
        },
        lunch: {
            amount: {
                type: Number,
                default: 0
            },
            isFrozen: {
                type: Boolean,
                default: false
            },
            frozenAt: {
                type: Date,
                default: null
            },
            frozenBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            },
            frozenReason: {
                type: String,
                default: ''
            }
        },
        dinner: {
            amount: {
                type: Number,
                default: 0
            },
            isFrozen: {
                type: Boolean,
                default: false
            },
            frozenAt: {
                type: Date,
                default: null
            },
            frozenBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: null
            },
            frozenReason: {
                type: String,
                default: ''
            }
        }
    },
    // Negative balance warning settings
    balanceWarning: {
        threshold: {
            type: Number,
            default: 100 // Warn when any balance goes below 100
        },
        notified: {
            type: Boolean,
            default: false
        },
        lastNotifiedAt: {
            type: Date,
            default: null
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Soft delete fields
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    deletedReason: {
        type: String,
        default: ''
    },
    restoredAt: {
        type: Date,
        default: null
    },
    restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    profileImage: {
        type: String,
        default: ''
    },
    // Two-Factor Authentication (2FA)
    twoFactorAuth: {
        isEnabled: {
            type: Boolean,
            default: false
        },
        secret: {
            type: String,
            default: null
        },
        backupCodes: [{
            code: String,
            used: {
                type: Boolean,
                default: false
            },
            usedAt: Date
        }],
        enabledAt: Date,
        method: {
            type: String,
            enum: ['totp', 'sms', 'email'],
            default: 'totp'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Get total balance
userSchema.methods.getTotalBalance = function () {
    return (this.balances.breakfast.amount || 0) +
           (this.balances.lunch.amount || 0) +
           (this.balances.dinner.amount || 0);
};

// Check if a specific balance is frozen
userSchema.methods.isBalanceFrozen = function (balanceType) {
    if (!['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
        return false;
    }
    return this.balances[balanceType].isFrozen;
};

// Check if any balance is below warning threshold
userSchema.methods.hasLowBalance = function () {
    const threshold = this.balanceWarning.threshold;
    return (this.balances.breakfast.amount < threshold) ||
           (this.balances.lunch.amount < threshold) ||
           (this.balances.dinner.amount < threshold);
};

// Get balance details for a specific type
userSchema.methods.getBalanceDetails = function (balanceType) {
    if (!['breakfast', 'lunch', 'dinner'].includes(balanceType)) {
        return null;
    }
    return this.balances[balanceType];
};

// Check if user has a specific permission
userSchema.methods.hasPermission = function (permission) {
    const { hasPermission, hasCustomPermission } = require('../config/permissions');

    // Check role-based permission
    const hasRolePermission = hasPermission(this.role, permission);

    // Check custom user permission
    const hasUserPermission = hasCustomPermission(this.permissions, permission);

    return hasRolePermission || hasUserPermission;
};

// Get all permissions for this user (role + custom)
userSchema.methods.getAllPermissions = function () {
    const { getRolePermissions } = require('../config/permissions');
    const rolePerms = getRolePermissions(this.role);
    const customPerms = this.permissions || [];

    // Combine and remove duplicates
    return [...new Set([...rolePerms, ...customPerms])];
};

// Indexes for performance
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isDeleted: 1, deletedAt: -1 });
userSchema.index({ 'balances.breakfast.amount': 1 });
userSchema.index({ 'balances.lunch.amount': 1 });
userSchema.index({ 'balances.dinner.amount': 1 });

module.exports = mongoose.model('User', userSchema);
