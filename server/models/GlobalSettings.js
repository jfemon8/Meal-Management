const mongoose = require('mongoose');

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
            default: true
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

    // Audit trail
    modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Static method to get settings (creates default if not exists)
globalSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ type: 'global' });

    if (!settings) {
        settings = await this.create({ type: 'global' });
    }

    return settings;
};

// Static method to update settings
globalSettingsSchema.statics.updateSettings = async function(updates, modifiedBy) {
    let settings = await this.findOne({ type: 'global' });

    if (!settings) {
        settings = new this({ type: 'global' });
    }

    // Deep merge updates
    Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
            settings[key] = { ...settings[key]?.toObject?.() || settings[key], ...updates[key] };
        } else {
            settings[key] = updates[key];
        }
    });

    settings.modifiedBy = modifiedBy;
    await settings.save();

    return settings;
};

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
