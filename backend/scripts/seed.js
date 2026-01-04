const mongoose = require('mongoose');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leave_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Holiday.deleteMany({});
    console.log('Cleared existing data');

    // Create Admin
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      leaveBalance: { casual: 10, sick: 10, earned: 15 }
    });
    await admin.save();
    console.log('Created admin user');

    // Create Manager
    const manager = new User({
      name: 'Manager User',
      email: 'manager@example.com',
      password: 'manager123',
      role: 'manager',
      leaveBalance: { casual: 10, sick: 10, earned: 15 }
    });
    await manager.save();
    console.log('Created manager user');

    // Create Employees
    const employee1 = new User({
      name: 'Employee One',
      email: 'employee1@example.com',
      password: 'employee123',
      role: 'employee',
      managerId: manager._id,
      leaveBalance: { casual: 10, sick: 10, earned: 15 }
    });
    await employee1.save();

    const employee2 = new User({
      name: 'Employee Two',
      email: 'employee2@example.com',
      password: 'employee123',
      role: 'employee',
      managerId: manager._id,
      leaveBalance: { casual: 8, sick: 10, earned: 12 }
    });
    await employee2.save();
    console.log('Created employee users');

    // Create Holidays
    const currentYear = new Date().getFullYear();
    const holidays = [
      { name: 'New Year', date: new Date(currentYear, 0, 1), type: 'national' },
      { name: 'Independence Day', date: new Date(currentYear, 7, 15), type: 'national' },
      { name: 'Republic Day', date: new Date(currentYear, 0, 26), type: 'national' },
      { name: 'Gandhi Jayanti', date: new Date(currentYear, 9, 2), type: 'national' },
      { name: 'Christmas', date: new Date(currentYear, 11, 25), type: 'national' },
      { name: 'Company Foundation Day', date: new Date(currentYear, 5, 1), type: 'company' }
    ];

    await Holiday.insertMany(holidays);
    console.log('Created holidays');

    console.log('\n=== Seed Data Summary ===');
    console.log('Admin: admin@example.com / admin123');
    console.log('Manager: manager@example.com / manager123');
    console.log('Employee 1: employee1@example.com / employee123');
    console.log('Employee 2: employee2@example.com / employee123');
    console.log(`\nCreated ${holidays.length} holidays for ${currentYear}`);
    console.log('\nSeed completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

