import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import sessionRoutes from './routes/session.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import contentRoutes from './routes/content.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import statsRoutes from './routes/stats.routes.js';
import adminRoutes from './routes/admin.routes.js';
import templateRoutes from './routes/template.routes.js';
import { globalErrorHandler } from './middleware/errorMiddleware.js';
import AppError from './utils/AppError.js';
import './jobs/cron.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

app.use(express.json({ limit: '10kb' }));



// Routes
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users/admin', adminRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/organizations', organizationRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND'));
});

app.use(globalErrorHandler);

export default app;
