import mongoose from 'mongoose';
import { IGroupDocument } from '../types';

const groupSchema = new mongoose.Schema({
    // Group name
    name: {
        type: String,
        required: [true, 'গ্রুপের নাম আবশ্যক'],
        trim: true,
        unique: true
    },
    // Group description
    description: {
        type: String,
        trim: true,
        default: ''
    },
    // Group code (short identifier)
    code: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true
    },
    // Group manager - the user who manages this group
    // This user can manage all users in this group
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // Group settings
    settings: {
        // Can group manager add users?
        canManagerAddUsers: {
            type: Boolean,
            default: true
        },
        // Can group manager remove users?
        canManagerRemoveUsers: {
            type: Boolean,
            default: true
        },
        // Can group manager edit user profiles?
        canManagerEditUsers: {
            type: Boolean,
            default: true
        },
        // Can group manager manage balances?
        canManagerManageBalance: {
            type: Boolean,
            default: true
        },
        // Can group manager view reports?
        canManagerViewReports: {
            type: Boolean,
            default: true
        },
        // Can group manager manage meals?
        canManagerManageMeals: {
            type: Boolean,
            default: true
        }
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// Virtual for getting member count
groupSchema.virtual('memberCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'group',
    count: true
});

// Virtual for getting members
groupSchema.virtual('members', {
    ref: 'User',
    localField: '_id',
    foreignField: 'group'
});

// Ensure virtuals are included in JSON
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

// Static method to get group with member count
groupSchema.statics.findWithMemberCount = async function(query: Record<string, any> = {}) {
    const groups = await this.find(query)
        .populate('manager', 'name email')
        .populate('createdBy', 'name')
        .lean();

    const User = mongoose.model('User');

    for (let group of groups) {
        (group as any).memberCount = await User.countDocuments({ group: (group as any)._id, isActive: true });
    }

    return groups;
};

// Static method to check if user is manager of a group
groupSchema.statics.isUserGroupManager = async function(userId: mongoose.Types.ObjectId | string, groupId: mongoose.Types.ObjectId | string): Promise<boolean> {
    const group = await this.findById(groupId);
    if (!group) return false;
    return group.manager && group.manager.toString() === userId.toString();
};

// Indexes
groupSchema.index({ name: 1 });
groupSchema.index({ code: 1 });
groupSchema.index({ manager: 1 });
groupSchema.index({ isActive: 1 });

export default mongoose.model<IGroupDocument>('Group', groupSchema);
