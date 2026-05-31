import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import ContentTemplate from '../models/ContentTemplate.js';
import QuizTemplate from '../models/QuizTemplate.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

// CreateAdmin
export const createAdmin = catchAsync(async (req, res, next) => {
    const {
        email, password, firstName, lastName,
        contentTemplateId, quizTemplateId, durationDays
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return next(new AppError('Email, password, firstName, lastName are required', 400, 'VALIDATION_ERROR'));
    }

    if (!contentTemplateId || !quizTemplateId) {
        return next(new AppError('contentTemplateId and quizTemplateId are required', 400, 'VALIDATION_ERROR'));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(new AppError('Email already exists', 400, 'DUPLICATE_EMAIL'));
    }

    const contentTemplate = await ContentTemplate.findById(contentTemplateId);
    const quizTemplate = await QuizTemplate.findById(quizTemplateId);

    if (!contentTemplate) {
        return next(new AppError('Content template not found', 404, 'CONTENT_TEMPLATE_NOT_FOUND'));
    }
    if (!quizTemplate) {
        return next(new AppError('Quiz template not found', 404, 'QUIZ_TEMPLATE_NOT_FOUND'));
    }

    if (!contentTemplate.isActive) {
        return next(new AppError('Content template is inactive', 400, 'TEMPLATE_INACTIVE'));
    }
    if (!quizTemplate.isActive) {
        return next(new AppError('Quiz template is inactive', 400, 'TEMPLATE_INACTIVE'));
    }

    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
        const [admin] = await User.create([{
            email,
            password,
            firstName,
            lastName,
            role: 'admin',
            isProfileComplete: true,
            adminSessionId: null
        }], { session: mongoSession });

        const days = Number(durationDays) || 30;
        const durationMinutes = days * 24 * 60;
        const now = new Date();
        const endDate = new Date(now.getTime() + durationMinutes * 60000);

        const sessionId = uuidv4();

        const [newSession] = await Session.create([{
            _id: sessionId,
            adminId: admin._id,
            contentTemplateId,
            quizTemplateId,
            title: `${firstName} ${lastName}'s ${contentTemplate.name} Session`,
            description: `Learning session using ${contentTemplate.name} content and ${quizTemplate.name} quizzes`,
            durationMinutes,
            startDate: now,
            endDate,
            expiresAt: endDate,
            status: 'active',
            price: 100,
            unlockedDays: [1], // Day 1 unlocked immediately
            currentDay: 1,
            totalEnrolled: 0
        }], { session: mongoSession });

        await User.findByIdAndUpdate(
            admin._id,
            { adminSessionId: sessionId },
            { session: mongoSession }
        );

        await mongoSession.commitTransaction();

        admin.password = undefined;

        res.status(201).json({
            status: 'success',
            message: 'Admin and session created successfully with templates.',
            data: {
                admin: {
                    id: admin._id,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    role: admin.role,
                    adminSessionId: sessionId
                },
                session: {
                    id: sessionId,
                    title: newSession.title,
                    contentTemplate: {
                        id: contentTemplate._id,
                        name: contentTemplate.name
                    },
                    quizTemplate: {
                        id: quizTemplate._id,
                        name: quizTemplate.name
                    },
                    durationDays: days,
                    durationMinutes,
                    startDate: now,
                    endDate,
                    expiresAt: endDate,
                    status: 'active',
                    unlockedDays: [1]
                }
            }
        });

    } catch (error) {
        await mongoSession.abortTransaction();

        if (error.code === 11000) {
            return next(new AppError('Duplicate email or session ID', 400, 'DUPLICATE_ERROR'));
        }

        return next(new AppError(`Admin creation failed: ${error.message}`, 500, 'TXN_FAILED'));
    } finally {
        mongoSession.endSession();
    }
});