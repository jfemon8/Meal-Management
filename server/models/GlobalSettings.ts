import mongoose from 'mongoose';
import { IGlobalSettings, IGlobalSettingsDocument, IGlobalSettingsModel } from '../types';

// Global meal settings that apply system-wide
const globalSettingsSchema = new mongoose.Schema({
    // Only one document should exist - use type as unique key
    type: {
        type: String,
        default: 'global',
        unique: true
    },

    // Default meal rates (used when MonthSettings doesn't exist)
    defaultRates: {
        lunch: {
            type: Number,
            default: 0,
            min: 0
        },
        dinner: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    // Default meal status for new users
    defaultMealStatus: {
        lunch: {
            type: Boolean,
            default: true
        },
        dinner: {
            type: Boolean,
            default: false  // Dinner is OFF by default for all users
        }
    },

    // Cutoff time for meal toggle (in hours, 24-hour format)
    cutoffTimes: {
        lunch: {
            type: Number,
            default: 10, // 10 AM
            min: 0,
            max: 23
        },
        dinner: {
            type: Number,
            default: 16, // 4 PM
            min: 0,
            max: 23
        }
    },

    // Weekend policy
    weekendPolicy: {
        // Is Friday meal off by default?
        fridayOff: {
            type: Boolean,
            default: true
        },
        // Is Saturday meal off by default?
        saturdayOff: {
            type: Boolean,
            default: false
        },
        // Odd Saturday off (1st, 3rd, 5th Saturday)
        oddSaturdayOff: {
            type: Boolean,
            default: true
        },
        // Even Saturday off (2nd, 4th Saturday)
        evenSaturdayOff: {
            type: Boolean,
            default: false
        }
    },

    // Holiday meal policy
    holidayPolicy: {
        // Auto turn off meals on government holidays
        governmentHolidayOff: {
            type: Boolean,
            default: true
        },
        // Auto turn off meals on optional holidays
        optionalHolidayOff: {
            type: Boolean,
            default: false
        },
        // Auto turn off meals on religious holidays
        religiousHolidayOff: {
            type: Boolean,
            default: true
        }
    },

    // Breakfast policy
    breakfastPolicy: {
        // Auto deduct from wallet when manager submits breakfast cost
        autoDeduct: {
            type: Boolean,
            default: true
        },
        // Require manager confirmation before auto-deduct
        requireConfirmation: {
            type: Boolean,
            default: false
        }
    },

    // Notification settings
    notifications: {
        // Send daily meal reminder
        dailyReminder: {
            enabled: {
                type: Boolean,
                default: false
            },
            time: {
                type: Number,
                default: 8 // 8 AM
            }
        },
        // Send low balance warning
        lowBalanceWarning: {
            enabled: {
                type: Boolean,
                default: true
            },
            threshold: {
                type: Number,
                default: 500
            }
        }
    },

    // Registration settings
    registration: {
        // Allow new user registration
        allowRegistration: {
            type: Boolean,
            default: true
        },
        // Default role for new registrations
        defaultRole: {
            type: String,
            enum: ['user', 'manager'],
            default: 'user'
        },
        // Require email verification
        requireEmailVerification: {
            type: Boolean,
            default: false
        }
    },

    // ==================== Maintenance Mode ====================
    maintenance: {
        // Is system in maintenance mode?
        isEnabled: {
            type: Boolean,
            default: false
        },
        // Maintenance message to display
        message: {
            type: String,
            default: 'সিস্টেম রক্ষণাবেক্ষণ চলছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
        },
        // English message
        messageEn: {
            type: String,
            default: 'System is under maintenance. Please try again later.'
        },
        // Scheduled start time (optional)
        scheduledStart: {
            type: Date,
            default: null
        },
        // Scheduled end time (optional)
        scheduledEnd: {
            type: Date,
            default: null
        },
        // Roles that can access during maintenance
        allowedRoles: {
            type: [String],
            default: ['superadmin']
        },
        // Specific users who can access (by ID)
        allowedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        // Who enabled maintenance
        enabledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // When maintenance was enabled
        enabledAt: {
            type: Date
        },
        // Reason for maintenance
        reason: {
            type: String
        }
    },

    // ==================== Advanced Rate Rules ====================
    rateRules: {
        // Enable advanced rate rules
        enabled: {
            type: Boolean,
            default: false
        },
        // Rules array (evaluated in order)
        rules: [{
            name: {
                type: String,
                required: true
            },
            description: String,
            isActive: {
                type: Boolean,
                default: true
            },
            priority: {
                type: Number,
                default: 0 // Higher priority = evaluated first
            },
            // Condition type
            conditionType: {
                type: String,
                enum: ['day_of_week', 'date_range', 'holiday', 'user_count', 'special_event'],
                required: true
            },
            // Condition parameters (depends on conditionType)
            conditionParams: {
                // For day_of_week: days array [0-6] (0=Sunday)
                days: [Number],
                // For date_range: start and end dates
                startDate: Date,
                endDate: Date,
                // For user_count: min/max user count
                minUsers: Number,
                maxUsers: Number,
                // For holiday: holiday types
                holidayTypes: [String],
                // For special_event: event name
                eventName: String
            },
            // Rate adjustment
            adjustment: {
                type: {
                    type: String,
                    enum: ['fixed', 'percentage', 'multiplier'],
                    default: 'fixed'
                },
                // For fixed: exact rate value
                // For percentage: percentage to add/subtract (-20 = 20% off)
                // For multiplier: multiply by this value (0.8 = 20% off)
                value: {
                    type: Number,
                    default: 0
                },
                // Apply to which meal type
                applyTo: {
                    type: String,
                    enum: ['lunch', 'dinner', 'both'],
                    default: 'both'
                }
            },
            // Validity period
            validFrom: Date,
            validUntil: Date,
            // Metadata
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    },

    // Audit trail
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Static method to get settings (creates default if not exists)
globalSettingsSchema.statics.getSettings = async function(): Promise<IGlobalSettingsDocument> {
    let settings = await this.findOne({ type: 'global' });

    if (!settings) {
        settings = await this.create({ type: 'global' });
    }

    return settings;
};

// Static method to update settings
globalSettingsSchema.statics.updateSettings = async function(updates: Partial<IGlobalSettings>, modifiedBy: mongoose.Types.ObjectId): Promise<IGlobalSettingsDocument> {
    let settings = await this.findOne({ type: 'global' });

    if (!settings) {
        settings = new this({ type: 'global' });
    }

    // Deep merge updates
    Object.keys(updates).forEach((key: string) => {
        if (typeof (updates as any)[key] === 'object' && !Array.isArray((updates as any)[key])) {
            (settings as any)[key] = { ...(settings as any)[key]?.toObject?.() || (settings as any)[key], ...(updates as any)[key] };
        } else {
            (settings as any)[key] = (updates as any)[key];
        }
    });

    settings.modifiedBy = modifiedBy;
    await settings.save();

    return settings;
};

export default mongoose.model<IGlobalSettingsDocument, IGlobalSettingsModel>('GlobalSettings', globalSettingsSchema);
