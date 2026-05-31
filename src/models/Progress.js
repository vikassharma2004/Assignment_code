import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const dailyProgressSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: Date, required: true },
  videoWatched: { type: Boolean, default: false },
  videoWatchedAt: Date,
  watchDuration: Number,
  quizAttempted: { type: Boolean, default: false },
  quizAttemptedAt: Date,
  quizScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  answers: [{ questionIndex: Number, selectedOption: Number }]
}, { _id: false });

const progressSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  enrollmentId: {
    type: String,
    required: true,
    unique: true
  },
  dailyProgress: [dailyProgressSchema],
  totalScore: { type: Number, default: 0 }
}, {
  timestamps: true,
  _id: false
});

progressSchema.index({ userId: 1, sessionId: 1 });

const Progress = mongoose.model('Progress', progressSchema);
export default Progress;