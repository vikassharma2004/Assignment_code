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

// AttemptQuiz
export const attemptQuiz = catchAsync(async (req, res, next) => {
  const { answers } = req.body; // Only answers, NO day!
  const { session, enrollment } = req;
  const userId = req.user.userId;

  if (!answers || !Array.isArray(answers)) {
    return next(new AppError('Answers array required', 400, 'VALIDATION_ERROR'));
  }

  const currentDay = getCurrentDay(session);

  if (!session.unlockedDays.includes(currentDay)) {
    return next(new AppError(`Day ${currentDay} is locked`, 403, 'CONTENT_LOCKED'));
  }

  const quizTemplate = await QuizTemplate.findById(session.quizTemplateId);
  if (!quizTemplate) {
    return next(new AppError('Quiz template not found', 404, 'TEMPLATE_NOT_FOUND'));
  }

  const quizDay = quizTemplate.quizDays.find(q => q.day === currentDay);
  if (!quizDay) {
    return next(new AppError(`No quiz for day ${currentDay}`, 404, 'NO_QUIZ'));
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

  if (dayProgress?.quizAttempted) {
    return res.status(200).json({
      status: 'success',
      data: {
        status: 'already_attempted',
        day: currentDay,
        attemptedAt: dayProgress.quizAttemptedAt,
        score: dayProgress.quizScore,
        maxScore: dayProgress.maxScore,
        percentage: dayProgress.maxScore > 0 ? Math.round((dayProgress.quizScore / dayProgress.maxScore) * 100) : 0,
        nextQuizAvailableAt: nextAvailable.toISOString(),
        timeRemaining: formatDuration(nextAvailable - new Date()),
        message: 'You already attempted today'
      }
    });
  }

  let score = 0;
  let maxScore = 0;

  answers.forEach((ans) => {
    const question = quizDay.questions[ans.questionIndex];
    if (question) {
      if (ans.selectedOption === question.correctAnswer) {
        score += question.score;
      }
      maxScore += question.score;
    }
  });

  const attemptTime = new Date();

  if (!dayProgress) {
    progress.dailyProgress.push({
      day: currentDay,
      date: attemptTime,
      videoWatched: false,
      videoWatchedAt: null,
      quizAttempted: true,
      quizAttemptedAt: attemptTime,
      quizScore: score,
      maxScore,
      answers
    });
  } else {
    dayProgress.quizAttempted = true;
    dayProgress.quizAttemptedAt = attemptTime;
    dayProgress.quizScore = score;
    dayProgress.maxScore = maxScore;
    dayProgress.answers = answers;
  }

  progress.totalScore = progress.dailyProgress.reduce((sum, d) => sum + (d.quizScore || 0), 0);
  await progress.save();

  res.status(200).json({
    status: 'success',
    data: {
      status: 'submitted',
      day: currentDay,
      score,
      maxScore,
      percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      attemptedAt: attemptTime,
      message: `Day ${currentDay} quiz submitted. Score: ${score}/${maxScore}`
    }
  });
});

// GetQuizQuestions
export const getQuizQuestions = catchAsync(async (req, res, next) => {
  const { day } = req.params;
  const { session } = req;

  const quizTemplate = await QuizTemplate.findById(session.quizTemplateId);
  if (!quizTemplate) {
    return next(new AppError('Quiz template not found', 404, 'TEMPLATE_NOT_FOUND'));
  }

  const quizDay = quizTemplate.quizDays.find(q => q.day === Number(day));
  if (!quizDay) {
    return next(new AppError(`No quiz for day ${day}`, 404, 'NO_QUIZ'));
  }

  const questionsWithoutAnswers = quizDay.questions.map(q => ({
    question: q.question,
    options: q.options,
    score: q.score
  }));

  res.status(200).json({
    status: 'success',
    data: {
      day: Number(day),
      title: quizDay.title,
      questionCount: quizDay.questions.length,
      maxScore: quizDay.maxScore,
      timeLimit: quizDay.timeLimit,
      questions: questionsWithoutAnswers
    }
  });
});