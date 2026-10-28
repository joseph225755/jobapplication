import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Counter from '../models/Counter.js';
import {
  ACTIVE_STATUSES,
  STATUSES,
  TRANSITIONS,
  addCalendarDays,
  isFutureDate,
  normalizeCompany,
  normalizeRole,
  serializeApplication
} from '../utils/applicationHelpers.js';

const ok = (res, status, message, data) => res.status(status).json({ success: true, message, data });
const fail = (res, status, message) => res.status(status).json({ success: false, message, data: null });
const validId = (id) => mongoose.isValidObjectId(id);

// --- In-memory fallback repository (Active only when MongoDB Atlas is disconnected) ---
const memCounters = new Map();
const nowMs = Date.now();
const dayMs = 86400000;

let memApplications = [
  {
    _id: new mongoose.Types.ObjectId().toString(),
    applicationId: 'JA-INF-001',
    companyName: 'Infosys',
    companyKey: 'infosys',
    jobRole: 'Graduate Engineer Trainee',
    jobRoleKey: 'graduate engineer trainee',
    jobType: 'Full-time',
    appliedDate: new Date(nowMs - 12 * dayMs),
    followUpDate: new Date(nowMs - 5 * dayMs),
    expectedSalary: 450000,
    notes: 'Submitted via campus portal. HR screening scheduled.',
    status: 'Applied',
    statusHistory: [
      { status: 'Applied', changedAt: new Date(nowMs - 12 * dayMs) }
    ],
    createdAt: new Date(nowMs - 12 * dayMs),
    updatedAt: new Date(nowMs - 12 * dayMs)
  },
  {
    _id: new mongoose.Types.ObjectId().toString(),
    applicationId: 'JA-GOO-001',
    companyName: 'Google',
    companyKey: 'google',
    jobRole: 'Frontend Engineer',
    jobRoleKey: 'frontend engineer',
    jobType: 'Full-time',
    appliedDate: new Date(nowMs - 10 * dayMs),
    followUpDate: new Date(nowMs - 3 * dayMs),
    expectedSalary: 1800000,
    notes: 'Technical round 1 completed; system design scheduled.',
    status: 'Interview',
    statusHistory: [
      { status: 'Applied', changedAt: new Date(nowMs - 10 * dayMs) },
      { status: 'Interview', changedAt: new Date(nowMs - 4 * dayMs) }
    ],
    createdAt: new Date(nowMs - 10 * dayMs),
    updatedAt: new Date(nowMs - 4 * dayMs)
  },
  {
    _id: new mongoose.Types.ObjectId().toString(),
    applicationId: 'JA-MIC-001',
    companyName: 'Microsoft',
    companyKey: 'microsoft',
    jobRole: 'Software Engineer II',
    jobRoleKey: 'software engineer ii',
    jobType: 'Full-time',
    appliedDate: new Date(nowMs - 16 * dayMs),
    followUpDate: new Date(nowMs - 9 * dayMs),
    expectedSalary: 2200000,
    notes: 'Received written offer. Reviewing benefits package.',
    status: 'Offer',
    statusHistory: [
      { status: 'Applied', changedAt: new Date(nowMs - 16 * dayMs) },
      { status: 'Interview', changedAt: new Date(nowMs - 8 * dayMs) },
      { status: 'Offer', changedAt: new Date(nowMs - 2 * dayMs) }
    ],
    createdAt: new Date(nowMs - 16 * dayMs),
    updatedAt: new Date(nowMs - 2 * dayMs)
  },
  {
    _id: new mongoose.Types.ObjectId().toString(),
    applicationId: 'JA-INF-002',
    companyName: 'Infosys',
    companyKey: 'infosys',
    jobRole: 'Cloud Support Associate',
    jobRoleKey: 'cloud support associate',
    jobType: 'Contract',
    appliedDate: new Date(nowMs - 3 * dayMs),
    followUpDate: new Date(nowMs + 4 * dayMs),
    expectedSalary: 380000,
    notes: 'Second application to Infosys for contract role.',
    status: 'Applied',
    statusHistory: [
      { status: 'Applied', changedAt: new Date(nowMs - 3 * dayMs) }
    ],
    createdAt: new Date(nowMs - 3 * dayMs),
    updatedAt: new Date(nowMs - 3 * dayMs)
  },
  {
    _id: new mongoose.Types.ObjectId().toString(),
    applicationId: 'JA-AMZ-001',
    companyName: 'Amazon',
    companyKey: 'amazon',
    jobRole: 'SDE Intern',
    jobRoleKey: 'sde intern',
    jobType: 'Internship',
    appliedDate: new Date(nowMs - 25 * dayMs),
    followUpDate: new Date(nowMs - 18 * dayMs),
    expectedSalary: 80000,
    notes: 'Offer accepted! Joining next month.',
    status: 'Accepted',
    statusHistory: [
      { status: 'Applied', changedAt: new Date(nowMs - 25 * dayMs) },
      { status: 'Interview', changedAt: new Date(nowMs - 15 * dayMs) },
      { status: 'Offer', changedAt: new Date(nowMs - 8 * dayMs) },
      { status: 'Accepted', changedAt: new Date(nowMs - 3 * dayMs) }
    ],
    createdAt: new Date(nowMs - 25 * dayMs),
    updatedAt: new Date(nowMs - 3 * dayMs)
  }
];

// Initialize counters for in-memory seed data
memCounters.set('infosys', 2);
memCounters.set('google', 1);
memCounters.set('microsoft', 1);
memCounters.set('amazon', 1);

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Concurrency-safe Application ID generator.
 * Uses atomic findOneAndUpdate on the Counter collection per normalized company name.
 * Format: JA-<FIRST_THREE_COMPANY_LETTERS>-<THREE_DIGIT_SEQUENCE>
 * Independent sequence maintained per normalized company name.
 */
async function nextApplicationId(companyName) {
  const companyKey = normalizeCompany(companyName);
  let sequence;

  if (isDbConnected()) {
    const counter = await Counter.findOneAndUpdate(
      { companyKey },
      { $inc: { sequence: 1 }, $setOnInsert: { companyKey } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sequence = counter.sequence;
  } else {
    sequence = (memCounters.get(companyKey) || 0) + 1;
    memCounters.set(companyKey, sequence);
  }

  const cleanChars = companyName.trim().replace(/[^a-zA-Z0-9]/g, '');
  const prefix = (cleanChars.slice(0, 3) || 'APP').toUpperCase().padEnd(3, 'X');
  const sequenceStr = String(sequence).padStart(3, '0');
  return `JA-${prefix}-${sequenceStr}`;
}

/**
 * GET /api/applications
 * Supports ?status=... and ?search=... with backend MongoDB filtering.
 */
export async function listApplications(req, res, next) {
  try {
    const { status, search } = req.query;

    if (status && status !== 'All statuses') {
      if (!STATUSES.includes(status)) {
        return fail(res, 400, 'Invalid status filter.');
      }
    }

    if (isDbConnected()) {
      const query = {};
      if (status && status !== 'All statuses') {
        query.status = status;
      }
      if (search?.trim()) {
        const searchRegex = {
          $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          $options: 'i'
        };
        query.$or = [
          { companyName: searchRegex },
          { jobRole: searchRegex },
          { applicationId: searchRegex }
        ];
      }
      const applications = await Application.find(query).sort({ appliedDate: -1, createdAt: -1 });
      return ok(res, 200, 'Applications retrieved successfully', applications.map(serializeApplication));
    }

    // In-memory fallback
    let results = [...memApplications];
    if (status && status !== 'All statuses') {
      results = results.filter((a) => a.status === status);
    }
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (a) =>
          a.companyName.toLowerCase().includes(q) ||
          a.jobRole.toLowerCase().includes(q) ||
          a.applicationId.toLowerCase().includes(q)
      );
    }
    results.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
    return ok(res, 200, 'Applications retrieved successfully', results.map(serializeApplication));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/applications/stats
 * Status counts and total calculated directly from database records.
 */
export async function getStats(_req, res, next) {
  try {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));

    if (isDbConnected()) {
      const grouped = await Application.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      grouped.forEach((row) => {
        if (counts[row._id] !== undefined) {
          counts[row._id] = row.count;
        }
      });
    } else {
      memApplications.forEach((app) => {
        if (counts[app.status] !== undefined) {
          counts[app.status] += 1;
        }
      });
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return ok(res, 200, 'Application statistics retrieved successfully', {
      total,
      counts
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/applications/:id
 */
export async function getApplication(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 404, 'Application not found.');
    }

    if (isDbConnected()) {
      const item = await Application.findById(req.params.id);
      if (!item) return fail(res, 404, 'Application not found.');
      return ok(res, 200, 'Application retrieved successfully', serializeApplication(item));
    }

    const item = memApplications.find((a) => String(a._id) === String(req.params.id));
    if (!item) return fail(res, 404, 'Application not found.');
    return ok(res, 200, 'Application retrieved successfully', serializeApplication(item));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/applications
 * Validates required inputs, prevents future dates, checks active duplicates, generates atomic ID.
 */
export async function createApplication(req, res, next) {
  try {
    const { companyName, jobRole, jobType, appliedDate, expectedSalary, notes } = req.body;

    if (!companyName?.trim() || !jobRole?.trim() || !jobType || !appliedDate) {
      return fail(res, 400, 'Company name, job role, job type, and applied date are required.');
    }

    if (!['Full-time', 'Internship', 'Contract'].includes(jobType)) {
      return fail(res, 400, 'Invalid job type. Must be Full-time, Internship, or Contract.');
    }

    if (isFutureDate(appliedDate)) {
      return fail(res, 400, 'Applied date cannot be in the future.');
    }

    if (
      expectedSalary !== undefined &&
      expectedSalary !== null &&
      expectedSalary !== '' &&
      (Number(expectedSalary) < 0 || !Number.isFinite(Number(expectedSalary)))
    ) {
      return fail(res, 400, 'Expected salary must be a non-negative number.');
    }

    const companyKey = normalizeCompany(companyName);
    const jobRoleKey = normalizeRole(jobRole);

    // Concurrency / Duplicate check: Reject if an active application already exists
    if (isDbConnected()) {
      const duplicate = await Application.findOne({
        companyKey,
        jobRoleKey,
        status: { $in: ACTIVE_STATUSES }
      });
      if (duplicate) {
        return fail(res, 409, 'An active application already exists for this company and job role.');
      }
    } else {
      const duplicate = memApplications.find(
        (a) => a.companyKey === companyKey && a.jobRoleKey === jobRoleKey && ACTIVE_STATUSES.includes(a.status)
      );
      if (duplicate) {
        return fail(res, 409, 'An active application already exists for this company and job role.');
      }
    }

    const parsedDate = new Date(appliedDate);
    const applicationId = await nextApplicationId(companyName);
    const followUpDate = addCalendarDays(parsedDate, 7);

    const appData = {
      applicationId,
      companyName: companyName.trim(),
      companyKey,
      jobRole: jobRole.trim(),
      jobRoleKey,
      jobType,
      appliedDate: parsedDate,
      followUpDate,
      expectedSalary: expectedSalary === '' || expectedSalary === undefined ? null : Number(expectedSalary),
      notes: notes ? String(notes).trim() : '',
      status: 'Applied',
      statusHistory: [{ status: 'Applied', changedAt: new Date() }]
    };

    if (isDbConnected()) {
      const created = await Application.create(appData);
      return ok(res, 201, 'Application created successfully', serializeApplication(created));
    }

    const newDoc = {
      _id: new mongoose.Types.ObjectId().toString(),
      ...appData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memApplications.unshift(newDoc);
    return ok(res, 201, 'Application created successfully', serializeApplication(newDoc));
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'A duplicate application or ID was detected. Please retry.');
    }
    next(error);
  }
}

/**
 * PUT /api/applications/:id
 * Only allows modifying companyName, jobRole, jobType, expectedSalary, and notes.
 * Explicitly rejects modification of applicationId, appliedDate, status, or statusHistory.
 */
export async function updateApplication(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 404, 'Application not found.');
    }

    let item;
    if (isDbConnected()) {
      item = await Application.findById(req.params.id);
    } else {
      item = memApplications.find((a) => String(a._id) === String(req.params.id));
    }

    if (!item) {
      return fail(res, 404, 'Application not found.');
    }

    // Never allow modification of applicationId or appliedDate
    if (req.body.applicationId !== undefined && req.body.applicationId !== item.applicationId) {
      return fail(res, 400, 'Modification of applicationId is not allowed.');
    }
    if (req.body.appliedDate !== undefined) {
      const incomingApplied = new Date(req.body.appliedDate).toISOString().slice(0, 10);
      const existingApplied = new Date(item.appliedDate).toISOString().slice(0, 10);
      if (incomingApplied !== existingApplied) {
        return fail(res, 400, 'Modification of appliedDate is not allowed after creation.');
      }
    }
    if (req.body.status !== undefined && req.body.status !== item.status) {
      return fail(res, 400, 'Status must be updated via the status update endpoint.');
    }
    if (req.body.statusHistory !== undefined) {
      return fail(res, 400, 'Direct modification of statusHistory is not allowed.');
    }

    const allowed = ['companyName', 'jobRole', 'jobType', 'expectedSalary', 'notes', '_id', 'id', 'appliedDate', 'applicationId'];
    const invalidKeys = Object.keys(req.body).filter((key) => !allowed.includes(key));
    if (invalidKeys.length > 0) {
      return fail(res, 400, `Forbidden fields in update: ${invalidKeys.join(', ')}.`);
    }

    const companyName = req.body.companyName !== undefined ? req.body.companyName : item.companyName;
    const jobRole = req.body.jobRole !== undefined ? req.body.jobRole : item.jobRole;
    const jobType = req.body.jobType !== undefined ? req.body.jobType : item.jobType;
    const expectedSalary = req.body.expectedSalary === undefined ? item.expectedSalary : req.body.expectedSalary;

    if (!companyName?.trim() || !jobRole?.trim()) {
      return fail(res, 400, 'Company name and job role are required.');
    }

    if (!['Full-time', 'Internship', 'Contract'].includes(jobType)) {
      return fail(res, 400, 'Invalid job type. Must be Full-time, Internship, or Contract.');
    }

    if (
      expectedSalary !== null &&
      expectedSalary !== '' &&
      (!Number.isFinite(Number(expectedSalary)) || Number(expectedSalary) < 0)
    ) {
      return fail(res, 400, 'Expected salary must be a non-negative number.');
    }

    const companyKey = normalizeCompany(companyName);
    const jobRoleKey = normalizeRole(jobRole);

    // Revalidate duplicate rules when company or role changes
    if (isDbConnected()) {
      const duplicate = await Application.findOne({
        _id: { $ne: item._id },
        companyKey,
        jobRoleKey,
        status: { $in: ACTIVE_STATUSES }
      });
      if (duplicate && ACTIVE_STATUSES.includes(item.status)) {
        return fail(res, 409, 'An active application already exists for this company and job role.');
      }
    } else {
      const duplicate = memApplications.find(
        (a) =>
          String(a._id) !== String(item._id) &&
          a.companyKey === companyKey &&
          a.jobRoleKey === jobRoleKey &&
          ACTIVE_STATUSES.includes(a.status)
      );
      if (duplicate && ACTIVE_STATUSES.includes(item.status)) {
        return fail(res, 409, 'An active application already exists for this company and job role.');
      }
    }

    item.companyName = companyName.trim();
    item.companyKey = companyKey;
    item.jobRole = jobRole.trim();
    item.jobRoleKey = jobRoleKey;
    item.jobType = jobType;
    item.expectedSalary = expectedSalary === '' || expectedSalary === null ? null : Number(expectedSalary);
    if (req.body.notes !== undefined) {
      item.notes = String(req.body.notes).trim();
    }
    item.updatedAt = new Date();

    if (isDbConnected()) {
      await item.save();
    }

    return ok(res, 200, 'Application updated successfully', serializeApplication(item));
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/applications/:id/status
 * Strictly enforces allowed transitions:
 * Applied -> Interview or Rejected
 * Interview -> Offer or Rejected
 * Offer -> Accepted or Declined
 * Rejected, Accepted, Declined are final.
 */
export async function changeStatus(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 404, 'Application not found.');
    }

    let item;
    if (isDbConnected()) {
      item = await Application.findById(req.params.id);
    } else {
      item = memApplications.find((a) => String(a._id) === String(req.params.id));
    }

    if (!item) {
      return fail(res, 404, 'Application not found.');
    }

    const nextStatus = req.body.status;
    if (!STATUSES.includes(nextStatus)) {
      return fail(res, 400, 'Invalid status.');
    }

    const allowedNext = TRANSITIONS[item.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      return fail(
        res,
        400,
        `Invalid status transition: cannot transition from ${item.status} to ${nextStatus}. Allowed: ${
          allowedNext.length ? allowedNext.join(', ') : 'none (final status)'
        }.`
      );
    }

    item.status = nextStatus;
    item.statusHistory.push({ status: nextStatus, changedAt: new Date() });
    item.updatedAt = new Date();

    if (isDbConnected()) {
      await item.save();
    }

    return ok(res, 200, 'Application status updated successfully', serializeApplication(item));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/applications/:id
 * Prohibits deletion while status is Interview or Offer.
 */
export async function deleteApplication(req, res, next) {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 404, 'Application not found.');
    }

    let item;
    if (isDbConnected()) {
      item = await Application.findById(req.params.id);
    } else {
      item = memApplications.find((a) => String(a._id) === String(req.params.id));
    }

    if (!item) {
      return fail(res, 404, 'Application not found.');
    }

    if (item.status === 'Interview' || item.status === 'Offer') {
      return fail(res, 400, 'Applications in Interview or Offer status cannot be deleted.');
    }

    if (isDbConnected()) {
      await item.deleteOne();
    } else {
      memApplications = memApplications.filter((a) => String(a._id) !== String(req.params.id));
    }

    return ok(res, 200, 'Application deleted successfully', { id: item._id });
  } catch (error) {
    next(error);
  }
}
