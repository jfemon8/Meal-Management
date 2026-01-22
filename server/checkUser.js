const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load environment variables
dotenv.config();

const checkUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected...');

        // Find user
        const user = await User.findOne({ email: 'jfemon8@gmail.com' });

        if (user) {
            console.log('✅ User found in database:');
            console.log('📧 Email:', user.email);
            console.log('👤 Name:', user.name);
            console.log('🔑 Role:', user.role);
            console.log('✅ Active:', user.isActive);
            console.log('🔒 Password hash exists:', !!user.password);
            console.log('🔒 Password hash length:', user.password.length);

            // Test password matching
            const isMatch = await user.matchPassword('Emon@123');
            console.log('🔐 Password match test:', isMatch ? 'SUCCESS ✅' : 'FAILED ❌');
        } else {
            console.log('❌ User NOT found in database');
        }

        // Disconnect
        await mongoose.disconnect();
        console.log('✅ Database disconnected');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

checkUser();
