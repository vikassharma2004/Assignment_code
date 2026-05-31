import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import ContentTemplate from '../models/ContentTemplate.js';
import QuizTemplate from '../models/QuizTemplate.js';
import { v4 as uuidv4 } from 'uuid';

// CreateContentTemplate
export const createContentTemplate = catchAsync(async (req, res, next) => {
    const { name, description, category, contentItems } = req.body;

    if (!name || !contentItems || !Array.isArray(contentItems)) {
        return next(new AppError('Name and contentItems array are required', 400, 'VALIDATION_ERROR'));
    }

    const days = contentItems.map(c => c.day).sort((a, b) => a - b);
    const expectedDays = Array.from({ length: contentItems.length }, (_, i) => i + 1);
    const missingDays = expectedDays.filter(d => !days.includes(d));

    if (missingDays.length > 0) {
        return next(new AppError(`Missing days: ${missingDays.join(', ')}`, 400, 'VALIDATION_ERROR'));
    }

    const template = await ContentTemplate.create({
        _id: uuidv4(),
        name,
        description,
        category,
        contentItems,
        createdBy: req.user.userId
    });

    res.status(201).json({
        status: 'success',
        message: 'Content template created',
        data: { template }
    });
});

// CreateQuizTemplate
export const createQuizTemplate = catchAsync(async (req, res, next) => {
    const { name, description, category, quizDays } = req.body;

    if (!name || !quizDays || !Array.isArray(quizDays)) {
        return next(new AppError('Name and quizDays array are required', 400, 'VALIDATION_ERROR'));
    }

    const template = await QuizTemplate.create({
        _id: uuidv4(),
        name,
        description,
        category,
        quizDays,
        createdBy: req.user.userId
    });

    res.status(201).json({
        status: 'success',
        message: 'Quiz template created',
        data: { template }
    });
});

// GetTemplates
export const getTemplates = catchAsync(async (req, res) => {
    const contentTemplates = await ContentTemplate.find({ isActive: true });
    const quizTemplates = await QuizTemplate.find({ isActive: true });

    res.status(200).json({
        status: 'success',
        data: {
            contentTemplates: contentTemplates.map(t => ({
                id: t._id,
                name: t.name,
                description: t.description,
                category: t.category,
                contentDays: t.contentItems.length
            })),
            quizTemplates: quizTemplates.map(t => ({
                id: t._id,
                name: t.name,
                description: t.description,
                category: t.category,
                quizDays: t.quizDays.length
            }))
        }
    });
});

// GetTemplateById
export const getTemplateById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { type } = req.query; // 'content' or 'quiz'

    let template;
    if (type === 'content') {
        template = await ContentTemplate.findById(id);
    } else if (type === 'quiz') {
        template = await QuizTemplate.findById(id);
    } else {
        return next(new AppError('Type query param required: content or quiz', 400, 'VALIDATION_ERROR'));
    }

    if (!template) {
        return next(new AppError('Template not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
        status: 'success',
        data: { template }
    });
});