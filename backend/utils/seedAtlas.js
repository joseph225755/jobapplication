import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Application from '../models/Application.js';
import Counter from '../models/Counter.js';
import { addCalendarDays, normalizeCompany, normalizeRole } from '../utils/applicationHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const nowMs = Date.now();
const dayMs = 86400000;

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('No MONGODB_URI found.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Atlas!');

  // Clear existing collections if desired
  await Application.deleteMany({});
  await Counter.deleteMany({});

  const sampleApps = [
    {
      companyName: 'Infosys',
      jobRole: 'Graduate Engineer Trainee',
      jobType: 'Full-time',
      appliedDate: new Date(nowMs - 14 * dayMs),
      expectedSalary: 450000,
      notes: 'Campus recruitment drive. Follow-up overdue.',
      status: 'Applied',
      statusHistory: [{ status: 'Applied', changedAt: new Date(nowMs - 14 * dayMs) }]
    },
    {
      companyName: 'Google',
      jobRole: 'Frontend Engineer',
      jobType: 'Full-time',
      appliedDate: new Date(nowMs - 10 * dayMs),
      expectedSalary: 1800000,
      notes: 'Passed screening, technical interview completed.',
      status: 'Interview',
      statusHistory: [
        { status: 'Applied', changedAt: new Date(nowMs - 10 * dayMs) },
        { status: 'Interview', changedAt: new Date(nowMs - 4 * dayMs) }
      ]
    },
    {
      companyName: 'Microsoft',
      jobRole: 'Software Engineer II',
      jobType: 'Full-time',
      appliedDate: new Date(nowMs - 18 * dayMs),
      expectedSalary: 2200000,
      notes: 'Received written offer. Reviewing benefits.',
      status: 'Offer',
      statusHistory: [
        { status: 'Applied', changedAt: new Date(nowMs - 18 * dayMs) },
        { status: 'Interview', changedAt: new Date(nowMs - 9 * dayMs) },
        { status: 'Offer', changedAt: new Date(nowMs - 2 * dayMs) }
      ]
    },
    {
      companyName: 'Amazon',
      jobRole: 'SDE Intern',
      jobType: 'Internship',
      appliedDate: new Date(nowMs - 28 * dayMs),
      expectedSalary: 80000,
      notes: 'Accepted offer! Start date next quarter.',
      status: 'Accepted',
      statusHistory: [
        { status: 'Applied', changedAt: new Date(nowMs - 28 * dayMs) },
        { status: 'Interview', changedAt: new Date(nowMs - 16 * dayMs) },
        { status: 'Offer', changedAt: new Date(nowMs - 8 * dayMs) },
        { status: 'Accepted', changedAt: new Date(nowMs - 3 * dayMs) }
      ]
    },
    {
      companyName: 'Meta',
      jobRole: 'Product Designer',
      jobType: 'Contract',
      appliedDate: new Date(nowMs - 22 * dayMs),
      expectedSalary: 1200000,
      notes: 'Position closed internally.',
      status: 'Rejected',
      statusHistory: [
        { status: 'Applied', changedAt: new Date(nowMs - 22 * dayMs) },
        { status: 'Rejected', changedAt: new Date(nowMs - 10 * dayMs) }
      ]
    }
  ];

  for (const item of sampleApps) {
    const companyKey = normalizeCompany(item.companyName);
    const counter = await Counter.findOneAndUpdate(
      { companyKey },
      { $inc: { sequence: 1 }, $setOnInsert: { companyKey } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const prefix = item.companyName.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    const applicationId = `JA-${prefix}-${String(counter.sequence).padStart(3, '0')}`;
    const followUpDate = addCalendarDays(item.appliedDate, 7);

    await Application.create({
      applicationId,
      companyName: item.companyName,
      companyKey,
      jobRole: item.jobRole,
      jobRoleKey: normalizeRole(item.jobRole),
      jobType: item.jobType,
      appliedDate: item.appliedDate,
      followUpDate,
      expectedSalary: item.expectedSalary,
      notes: item.notes,
      status: item.status,
      statusHistory: item.statusHistory
    });

    console.log(`Created in Atlas: ${applicationId} - ${item.companyName}`);
  }

  console.log('✓ Successfully seeded live MongoDB Atlas database with verified records!');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
