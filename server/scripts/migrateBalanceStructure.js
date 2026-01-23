/**
 * Migration Script: Convert User Balance Structure
 *
 * Old Structure:
 * balances: {
 *   breakfast: 100,
 *   lunch: 200,
 *   dinner: 150
 * }
 *
 * New Structure:
 * balances: {
 *   breakfast: {
 *     amount: 100,
 *     isFrozen: false,
 *     frozenAt: null,
 *     frozenBy: null,
 *     frozenReason: ''
 *   },
 *   lunch: { ... },
 *   dinner: { ... }
 * }
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-management')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

const migrateBalances = async () => {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        console.log('🔍 Finding users with old balance structure...');

        // Find users where breakfast is a number (old structure)
        const usersToMigrate = await usersCollection.find({
            'balances.breakfast': { $type: 'number' }
        }).toArray();

        console.log(`📊 Found ${usersToMigrate.length} users to migrate`);

        if (usersToMigrate.length === 0) {
            console.log('✅ No users need migration. All users already have the new structure.');
            process.exit(0);
        }

        let migratedCount = 0;
        let errorCount = 0;

        for (const user of usersToMigrate) {
            try {
                const oldBalances = user.balances;

                // Create new structure
                const newBalances = {
                    breakfast: {
                        amount: oldBalances.breakfast || 0,
                        isFrozen: false,
                        frozenAt: null,
                        frozenBy: null,
                        frozenReason: ''
                    },
                    lunch: {
                        amount: oldBalances.lunch || 0,
                        isFrozen: false,
                        frozenAt: null,
                        frozenBy: null,
                        frozenReason: ''
                    },
                    dinner: {
                        amount: oldBalances.dinner || 0,
                        isFrozen: false,
                        frozenAt: null,
                        frozenBy: null,
                        frozenReason: ''
                    }
                };

                // Add balanceWarning if it doesn't exist
                const balanceWarning = user.balanceWarning || {
                    threshold: 100,
                    notified: false,
                    lastNotifiedAt: null
                };

                // Update user
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            balances: newBalances,
                            balanceWarning: balanceWarning
                        }
                    }
                );

                migratedCount++;
                console.log(`✅ Migrated user: ${user.name} (${user.email})`);
                console.log(`   - Breakfast: ${oldBalances.breakfast} → ${newBalances.breakfast.amount}`);
                console.log(`   - Lunch: ${oldBalances.lunch} → ${newBalances.lunch.amount}`);
                console.log(`   - Dinner: ${oldBalances.dinner} → ${newBalances.dinner.amount}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Error migrating user ${user.email}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   - Total users found: ${usersToMigrate.length}`);
        console.log(`   - Successfully migrated: ${migratedCount}`);
        console.log(`   - Errors: ${errorCount}`);

        if (migratedCount === usersToMigrate.length) {
            console.log('\n✅ Migration completed successfully!');
        } else {
            console.log('\n⚠️  Migration completed with some errors. Please check the logs.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

// Run migration
setTimeout(() => {
    console.log('🚀 Starting balance structure migration...\n');
    migrateBalances();
}, 1000);
