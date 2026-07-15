const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cert-system')
    .then(async () => {
        console.log('Connected to MongoDB for seeding');
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin.email);
            process.exit(0);
        }
        const admin = new User({
            name: 'Site Administrator',
            email: 'admin@example.com',
            password: 'password123',
            role: 'admin'
        });
        await admin.save();
        console.log('Admin user registered successfully! Email: admin@example.com, Password: password123');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error seeding admin user:', err);
        process.exit(1);
    });
