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
            type: Number,
            default: 0
        },
        lunch: {
            type: Number,
            default: 0
        },
        dinner: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profileImage: {
        type: String,
        default: ''
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
    return this.balances.breakfast + this.balances.lunch + this.balances.dinner;
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

module.exports = mongoose.model('User', userSchema);
