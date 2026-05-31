import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    score: { type: Number, default: 10 }
}, { _id: false });

const quizDaySchema = new mongoose.Schema({
    day: { type: Number, required: true, min: 1, max: 30 },
    title: { type: String, required: true },
    questions: [questionSchema],
    maxScore: { type: Number, default: 0 },
    timeLimit: { type: Number, default: 600 } // seconds
}, { _id: false });

const quizTemplateSchema = new mongoose.Schema({
    _id: { type: String, default: () => uuidv4() },
    name: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['system-design', 'backend', 'frontend', 'devops', 'general'],
        default: 'general'
    },
    quizDays: [quizDaySchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, _id: false });

quizTemplateSchema.pre('save', function (next) {
    this.quizDays.forEach(day => {
        day.maxScore = day.questions.reduce((sum, q) => sum + (q.score || 10), 0);
    });
    next();
});

const QuizTemplate = mongoose.model('QuizTemplate', quizTemplateSchema);
export default QuizTemplate;