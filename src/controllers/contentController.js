import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Progress from '../models/Progress.js';
import ContentTemplate from '../models/ContentTemplate.js';
import QuizTemplate from '../models/QuizTemplate.js';
import { v4 as uuidv4 } from 'uuid';

const getCurrentDay = (session) => {
  const now = new Date();
  const daysElapsed = Math.floor((now - session.startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(daysElapsed + 1, 30));
};

const getNextMidnightUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
};

const formatDuration = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// GetDailyContent
export const getDailyContent = catchAsync(async (req, res, next) => {
  const { session, enrollment } = req;

  const contentTemplate = await ContentTemplate.findById(session.contentTemplateId);
  if (!contentTemplate) {
    return next(new AppError('Content template not found', 404, 'TEMPLATE_NOT_FOUND'));
  }

  const quizTemplate = await QuizTemplate.findById(session.quizTemplateId);
  if (!quizTemplate) {
    return next(new AppError('Quiz template not found', 404, 'TEMPLATE_NOT_FOUND'));
  }

  const currentDay = getCurrentDay(session);

  if (!session.unlockedDays.includes(currentDay)) {
    return next(new AppError(`Day ${currentDay} is locked. Available days: ${session.unlockedDays.join(', ')}`, 403, 'CONTENT_LOCKED'));
  }

  const contentItem = contentTemplate.contentItems.find(c => c.day === currentDay);
  if (!contentItem) {
    return next(new AppError(`No content for day ${currentDay}`, 404, 'NOT_FOUND'));
  }

  const quizDay = quizTemplate.quizDays.find(q => q.day === currentDay);

  const progress = await Progress.findOne({ enrollmentId: enrollment._id });
  const dayProgress = progress?.dailyProgress.find(p => p.day === currentDay);

  const nextAvailable = getNextMidnightUTC();

  res.status(200).json({
    status: 'success',
    data: {
      day: currentDay,
      sessionTitle: session.title,
      templateName: contentTemplate.name,
      video: {
        url: contentItem.videoUrl,
        title: contentItem.title,
        description: contentItem.description,
        duration: contentItem.duration,
        isWatched: dayProgress?.videoWatched || false,
        watchedAt: dayProgress?.videoWatchedAt || null,
        nextVideoAvailableAt: nextAvailable.toISOString(),
        timeRemaining: formatDuration(nextAvailable - new Date())
      },
      quiz: {
        id: quizDay ? `${session.quizTemplateId}_day${currentDay}` : null,
        title: quizDay?.title || `${contentItem.title} Quiz`,
        questionCount: quizDay?.questions?.length || 0,
        maxScore: quizDay?.maxScore || 0,
        timeLimit: quizDay?.timeLimit || 600,
        isAttempted: dayProgress?.quizAttempted || false,
        attemptedAt: dayProgress?.quizAttemptedAt || null,
        score: dayProgress?.quizScore || null,
        nextQuizAvailableAt: nextAvailable.toISOString(),
        timeRemaining: formatDuration(nextAvailable - new Date())
      }
    }
  });
});

// WatchVideo
export const watchVideo = catchAsync(async (req, res, next) => {
  const { session, enrollment } = req;
  const userId = req.user.userId;

  const currentDay = getCurrentDay(session);

  if (!session.unlockedDays.includes(currentDay)) {
    return next(new AppError(`Day ${currentDay} is locked`, 403, 'CONTENT_LOCKED'));
  }

  let progress = await Progress.findOne({ enrollmentId: enrollment._id });

  if (!progress) {
    progress = await Progress.create({
      _id: uuidv4(),
      userId,
      sessionId: session._id,
      enrollmentId: enrollment._id,
      dailyProgress: [],
      totalScore: 0
    });
  }

  let dayProgress = progress.dailyProgress.find(p => p.day === currentDay);
  const nextAvailable = getNextMidnightUTC();

  if (dayProgress?.videoWatched) {
    return res.status(200).json({
      status: 'success',
      data: {
        status: 'already_watched',
        day: currentDay,
        watchedAt: dayProgress.videoWatchedAt,
        nextVideoAvailableAt: nextAvailable.toISOString(),
        timeRemaining: formatDuration(nextAvailable - new Date()),
        message: 'You already watched today'
      }
    });
  }

  const watchTime = new Date();

  if (!dayProgress) {
    progress.dailyProgress.push({
      day: currentDay,
      date: watchTime,
      videoWatched: true,
      videoWatchedAt: watchTime,
      quizAttempted: false,
      quizAttemptedAt: null,
      quizScore: 0,
      maxScore: 0,
      answers: []
    });
  } else {
    dayProgress.videoWatched = true;
    dayProgress.videoWatchedAt = watchTime;
  }

  await progress.save();

  res.status(200).json({
    status: 'success',
    data: {
      status: 'watched',
      day: currentDay,
      watchedAt: watchTime,
      message: `Day ${currentDay} video marked as watched`
    }
  });
});

// GetProgress
export const getProgress = catchAsync(async (req, res) => {
  const { enrollment } = req;

  const progress = await Progress.findOne({ enrollmentId: enrollment._id });

  res.status(200).json({
    status: 'success',
    data: {
      totalScore: progress?.totalScore || 0,
      daysCompleted: progress?.dailyProgress.filter(d => d.videoWatched).length || 0,
      quizzesCompleted: progress?.dailyProgress.filter(d => d.quizAttempted).length || 0,
      dailyProgress: progress?.dailyProgress || []
    }
  });
});

// GetHistory
export const getHistory = catchAsync(async (req, res) => {
  const { userId } = req.user;

  const allProgress = await Progress.find({ userId })
    .populate('sessionId', 'title startDate endDate status contentTemplateId quizTemplateId')
    .sort({ createdAt: -1 });

  const history = await Promise.all(allProgress.map(async (p) => {
    const contentTemplate = await ContentTemplate.findById(p.sessionId?.contentTemplateId);

    return {
      sessionId: p.sessionId?._id,
      sessionTitle: p.sessionId?.title || 'Deleted Session',
      templateName: contentTemplate?.name || 'Unknown',
      sessionStatus: p.sessionId?.status || 'expired',
      totalScore: p.totalScore,
      daysCompleted: p.dailyProgress.filter(d => d.videoWatched).length,
      quizzesCompleted: p.dailyProgress.filter(d => d.quizAttempted).length,
      completedAt: p.updatedAt
    };
  }));

  res.status(200).json({
    status: 'success',
    data: { history }
  });
});