import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const contentItemSchema = new mongoose.Schema({
    day: { type: Number, required: true, min: 1, max: 30 },
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    description: { type: String, default: '' },
    duration: { type: Number, default: 600 } // seconds
}, { _id: false });

const contentTemplateSchema = new mongoose.Schema({
    _id: { type: String, default: () => uuidv4() },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['system-design', 'backend', 'frontend', 'devops', 'general'],
        default: 'general'
    },
    contentItems: [contentItemSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, _id: false });

const ContentTemplate = mongoose.model('ContentTemplate', contentTemplateSchema);
export default ContentTemplate;