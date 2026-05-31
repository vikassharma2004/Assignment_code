import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const sessionSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4(), required: true },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentTemplateId: {
    type: String,
    ref: 'ContentTemplate',
    required: true
  },
  quizTemplateId: {
    type: String,
    ref: 'QuizTemplate',
    required: true
  },

  title: { type: String, required: true },
  description: { type: String, default: '' },
  durationMinutes: {
    type: Number,
    required: [true, 'Duration in minutes is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '0s' }
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
    index: true
  },
  price: { type: Number, default: 100 },
  currency: { type: String, default: 'USD' },

  // Track unlocked days
  unlockedDays: [{ type: Number }],
  currentDay: { type: Number, default: 1 },

  totalEnrolled: { type: Number, default: 0 },
  maxSeats: { type: Number, default: null }
}, { timestamps: true, _id: false });

sessionSchema.pre('save', function (next) {
  if (this.isModified('durationMinutes') || this.isNew) {
    this.endDate = new Date(this.startDate.getTime() + this.durationMinutes * 60 * 1000);
  }
  next();
});

const Session = mongoose.model('Session', sessionSchema);
export default Session;