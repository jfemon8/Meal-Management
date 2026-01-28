/**
 * Database Migration Script
 * Adds default permissions to all existing users based on their roles
 *
 * Run: node server/scripts/migrateUserPermissions.js
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import User from '../models/User';
import { getRolePermissions } from '../config/permissions';

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meal-management');
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const migratePermissions = async (): Promise<void> => {
    try {
        console.log('\n🚀 Starting User Permission Migration...\n');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate\n`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of users) {
            try {
                // Get default permissions for user's role
                const rolePermissions = getRolePermissions(user.role);

                // Check if user already has permissions field
                if (user.permissions && user.permissions.length > 0) {
                    console.log(`⏭️  Skipped: ${user.name} (${user.email}) - Already has permissions`);
                    skipped++;
                    continue;
                }

                // Set permissions based on role
                user.permissions = rolePermissions;
                await user.save();

                migrated++;
                console.log(`✅ Migrated: ${user.name} (${user.email}) - Role: ${user.role} - Permissions: ${rolePermissions.length}`);

            } catch (error: any) {
                errors++;
                console.error(`❌ Error migrating user ${user.email}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Successfully Migrated: ${migrated} users`);
        console.log(`⏭️  Skipped: ${skipped} users`);
        console.log(`❌ Errors: ${errors} users`);
        console.log('='.repeat(60) + '\n');

        if (migrated > 0) {
            console.log('🎉 Migration completed successfully!\n');
        } else if (skipped === users.length) {
            console.log('ℹ️  All users already have permissions assigned.\n');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

const main = async (): Promise<void> => {
    try {
        await connectDB();
        await migratePermissions();

        console.log('✅ Closing database connection...');
        await mongoose.connection.close();
        console.log('👋 Done!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
};

// Run migration
main();
