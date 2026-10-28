import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Declined'], required: true },
  changedAt: { type: Date, required: true, default: Date.now }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true, immutable: true },
  companyName: { type: String, required: true, trim: true },
  companyKey: { type: String, required: true, index: true },
  jobRole: { type: String, required: true, trim: true },
  jobRoleKey: { type: String, required: true, lowercase: true, trim: true },
  jobType: { type: String, enum: ['Full-time', 'Internship', 'Contract'], required: true },
  appliedDate: { type: Date, required: true, immutable: true },
  expectedSalary: { type: Number, min: 0, default: null },
  notes: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Declined'], default: 'Applied', required: true },
  followUpDate: { type: Date, required: true, immutable: true },
  statusHistory: { type: [historySchema], default: [] }
}, { timestamps: true });

applicationSchema.index({ companyKey: 1, jobRoleKey: 1, status: 1 });
export default mongoose.model('Application', applicationSchema);
