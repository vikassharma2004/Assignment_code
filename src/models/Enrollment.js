import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const enrollmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4(), required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      ref: 'Session',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'sponsored'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['self', 'organization'],
      default: 'self',
    },
    sponsoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    dailyVideosWatched: {
      type: Number,
      default: 0,
    },
    dailyQuizzesAttempted: {
      type: Number,
      default: 0,
    },
    totalVideosWatched: {
      type: Number,
      default: 0,
    },
    totalQuizzesAttempted: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' },
    },
  },
  { timestamps: true, _id: false }
);

enrollmentSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
