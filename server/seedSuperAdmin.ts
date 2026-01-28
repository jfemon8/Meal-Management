import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';

// Load environment variables
dotenv.config();

const seedSuperAdmin = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('✅ MongoDB Connected...');

        // Check if superadmin already exists
        const existingSuperAdmin = await User.findOne({ email: 'jfemon8@gmail.com' });

        if (existingSuperAdmin) {
            console.log('ℹ️  Superadmin already exists with email: jfemon8@gmail.com');

            // Update role if not superadmin
            if (existingSuperAdmin.role !== 'superadmin') {
                existingSuperAdmin.role = 'superadmin';
                await existingSuperAdmin.save();
                console.log('✅ User role updated to superadmin');
            }
        } else {
            // Create new superadmin
            const superAdmin = await User.create({
                name: 'Super Admin',
                email: 'jfemon8@gmail.com',
                password: 'Emon@123',
                role: 'superadmin',
                phone: '',
                balances: {
                    breakfast: 0,
                    lunch: 0,
                    dinner: 0
                },
                isActive: true
            });

            console.log('✅ Superadmin created successfully!');
            console.log('📧 Email:', superAdmin.email);
            console.log('👤 Role:', superAdmin.role);
        }

        // Disconnect
        await mongoose.disconnect();
        console.log('✅ Database disconnected');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedSuperAdmin();
