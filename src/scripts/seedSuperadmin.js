import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const seedSuperadmin = async () => {
  try {
    const DB_URI = env.MONGODB_URI;
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB...');

    const superadminCount = await User.countDocuments({ role: 'superadmin' });
    if (superadminCount > 0) {
      console.log('A superadmin already exists. Skipping creation.');
      process.exit(0);
    }

    const superadmin = await User.create({
      email: 'superadmin@system.com',
      password: 'SuperAdmin123!',
      role: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      isProfileComplete: true
    });

    console.log('Dummy superadmin created successfully!');
    console.log('Email: superadmin@system.com');
    console.log('Password: SuperAdmin123!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  }
};


