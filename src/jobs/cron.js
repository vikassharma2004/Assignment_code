import cron from 'node-cron';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import crypto from 'crypto';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log(`[CRON] Running at ${new Date().toISOString()}`);

  try {
    const now = new Date();

    // 1. EXPIRE SESSIONS
    const expiredSessions = await Session.find({
      status: 'active',
      endDate: { $lte: now }
    });

    for (const session of expiredSessions) {
      console.log(`[CRON] Expiring session: ${session._id}`);

      // Mark session as expired
      await Session.findByIdAndUpdate(session._id, { status: 'expired' });

      // Find and DELETE all enrollments
      const enrollments = await Enrollment.find({ sessionId: session._id });

      for (const enrollment of enrollments) {
        // Blacklist token
        await TokenBlacklist.create({
          tokenHash: hashToken(`session_${session._id}_user_${enrollment.userId}`),
          userId: enrollment.userId,
          sessionId: session._id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        // DELETE enrollment (allows re-enrollment)
        await Enrollment.findByIdAndDelete(enrollment._id);
        console.log(`[CRON] Deleted enrollment: ${enrollment._id}`);
      }

      console.log(`[CRON] Session ${session._id} expired, ${enrollments.length} enrollments deleted`);
    }

    // 2. UNLOCK NEXT DAY for active sessions
    const activeSessions = await Session.find({ status: 'active' });

    for (const session of activeSessions) {
      const daysElapsed = Math.floor((now - session.startDate) / (1000 * 60 * 60 * 24));
      const currentDay = Math.min(daysElapsed + 1, 30);

      // Unlock current day if not already unlocked
      if (!session.unlockedDays.includes(currentDay)) {
        await Session.findByIdAndUpdate(
          session._id,
          {
            $push: { unlockedDays: currentDay },
            $set: { currentDay }
          }
        );
        console.log(`[CRON] Unlocked day ${currentDay} for session ${session._id}`);
      }
    }

  } catch (error) {
    console.error('[CRON] Error:', error);
  }
});

export default cron;