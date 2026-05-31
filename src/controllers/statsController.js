import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import Progress from '../models/Progress.js';
import Enrollment from '../models/Enrollment.js';
import Session from '../models/Session.js';
import mongoose from 'mongoose';

const getCurrentDay = (session) => {
  const now = new Date();
  const daysElapsed = Math.floor((now - session.startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(daysElapsed + 1, 30));
};

// GetMyStats
export const getMyStats = catchAsync(async (req, res, next) => {
  const userId = req.user.userId;

  const progressDocs = await Progress.find({ userId })
    .populate('sessionId', 'title startDate endDate');

  const sessionStats = progressDocs.map(doc => {
    const videosWatched = doc.dailyProgress.filter(d => d.videoWatched).length;
    const quizzesAttempted = doc.dailyProgress.filter(d => d.quizAttempted).length;
    const totalQuizScore = doc.dailyProgress.reduce((sum, d) => sum + (d.quizScore || 0), 0);
    const totalMaxScore = doc.dailyProgress.reduce((sum, d) => sum + (d.maxScore || 0), 0);

    return {
      sessionId: doc.sessionId?._id,
      sessionTitle: doc.sessionId?.title || 'Deleted Session',
      sessionStatus: doc.sessionId?.status || 'expired',
      startDate: doc.sessionId?.startDate,
      endDate: doc.sessionId?.endDate,
      totalVideosWatched: videosWatched,
      totalQuizzesAttempted: quizzesAttempted,
      totalQuizScore,
      totalMaxScore,
      averagePercentage: totalMaxScore > 0 ? Math.round((totalQuizScore / totalMaxScore) * 100) : 0,
      daysCompleted: videosWatched
    };
  });

  const overallStats = {
    totalSessions: sessionStats.length,
    totalVideosWatched: sessionStats.reduce((sum, s) => sum + s.totalVideosWatched, 0),
    totalQuizzesAttempted: sessionStats.reduce((sum, s) => sum + s.totalQuizzesAttempted, 0),
    totalQuizScore: sessionStats.reduce((sum, s) => sum + s.totalQuizScore, 0),
    totalMaxScore: sessionStats.reduce((sum, s) => sum + s.totalMaxScore, 0)
  };

  res.status(200).json({
    status: 'success',
    data: {
      overall: overallStats,
      sessions: sessionStats
    }
  });
});

// TrackProgress
export const trackProgress = catchAsync(async (req, res, next) => {
  const { type } = req.body;  // 'video' or 'quiz'
  const { session, enrollment } = req;  // From sessionValidator middleware
  const userId = req.user.userId;

  if (!type || !['video', 'quiz'].includes(type)) {
    return next(new AppError('Type must be "video" or "quiz"', 400, 'VALIDATION_ERROR'));
  }

  const currentDay = getCurrentDay(session);

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

  if (!dayProgress) {
    dayProgress = {
      day: currentDay,
      date: new Date(),
      videoWatched: false,
      videoWatchedAt: null,
      quizAttempted: false,
      quizAttemptedAt: null,
      quizScore: 0,
      maxScore: 0,
      answers: []
    };
    progress.dailyProgress.push(dayProgress);
  }

  const now = new Date();

  if (type === 'video') {
    if (dayProgress.videoWatched) {
      const nextAvailable = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const hoursRemaining = Math.floor((nextAvailable - now) / (1000 * 60 * 60));
      const minutesRemaining = Math.floor(((nextAvailable - now) % (1000 * 60 * 60)) / (1000 * 60));

      return res.status(200).json({
        status: 'success',
        data: {
          status: 'already_watched',
          day: currentDay,
          watchedAt: dayProgress.videoWatchedAt,
          nextVideoAvailableAt: nextAvailable.toISOString(),
          timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
          message: `You already watched today's video. Next video available at midnight UTC.`
        }
      });
    }

    dayProgress.videoWatched = true;
    dayProgress.videoWatchedAt = now;
    await progress.save();

    return res.status(200).json({
      status: 'success',
      data: {
        status: 'watched',
        day: currentDay,
        watchedAt: now,
        message: `Day ${currentDay} video marked as watched`
      }
    });
  }

  if (type === 'quiz') {
    if (dayProgress.quizAttempted) {
      const nextAvailable = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const hoursRemaining = Math.floor((nextAvailable - now) / (1000 * 60 * 60));
      const minutesRemaining = Math.floor(((nextAvailable - now) % (1000 * 60 * 60)) / (1000 * 60));

      return res.status(200).json({
        status: 'success',
        data: {
          status: 'already_attempted',
          day: currentDay,
          attemptedAt: dayProgress.quizAttemptedAt,
          score: dayProgress.quizScore,
          maxScore: dayProgress.maxScore,
          nextQuizAvailableAt: nextAvailable.toISOString(),
          timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
          message: `You already attempted today's quiz. Next quiz available at midnight UTC.`
        }
      });
    }

    return res.status(400).json({
      status: 'fail',
      errorCode: 'USE_QUIZ_ENDPOINT',
      message: 'Use POST /api/quizzes/attempt to submit quiz answers'
    });
  }
});