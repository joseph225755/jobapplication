import mongoose from 'mongoose';
const counterSchema = new mongoose.Schema({
  companyKey: { type: String, required: true, unique: true },
  sequence: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model('Counter', counterSchema);
