import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const tokenBlacklistSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4(), required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: '0s' } },
}, { timestamps: true, _id: false });

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

export default TokenBlacklist;
