const QuizAttempt = require('../models/QuizAttempt');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// ── POST /api/quiz/attempts  { region, score, total } ────────────
exports.recordAttempt = async (req, res, next) => {
  try {
    const { region, score, total } = req.body; // validated by zod
    const attempt = await QuizAttempt.create({ user: req.user.id, region, score, total });
    res.status(201).json(attempt);
  } catch (err) { next(err); }
};

// ── GET /api/quiz/attempts?limit= ─────────────────────────────────
exports.getHistory = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const attempts = await QuizAttempt.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ attempts });
  } catch (err) { next(err); }
};

// ── GET /api/quiz/stats ────────────────────────────────────────
// Computes best/average score and a day-streak (consecutive calendar
// days, UTC, with at least one attempt) from the user's attempt history.
exports.getStats = async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.user.id })
      .select('score total createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (!attempts.length) {
      return res.json({ totalAttempts: 0, bestScorePct: 0, averagePct: 0, currentStreak: 0, longestStreak: 0 });
    }

    const totalAttempts = attempts.length;
    const pcts = attempts.map((a) => a.score / a.total);
    const bestScorePct = Math.round(Math.max(...pcts) * 100);
    const averagePct   = Math.round((pcts.reduce((sum, p) => sum + p, 0) / totalAttempts) * 100);

    // Unique attempt days, newest first.
    const daysDesc = [...new Set(attempts.map((a) => dayKey(a.createdAt)))].sort().reverse();

    // Current streak: walk back from today (or yesterday, if nothing was
    // done today yet) counting consecutive days with an attempt.
    const todayKey = dayKey(new Date());
    let cursor = daysDesc[0] === todayKey
      ? new Date(`${todayKey}T00:00:00.000Z`)
      : new Date(new Date(`${todayKey}T00:00:00.000Z`).getTime() - ONE_DAY_MS);

    let currentStreak = 0;
    for (const d of daysDesc) {
      if (d === dayKey(cursor)) {
        currentStreak += 1;
        cursor = new Date(cursor.getTime() - ONE_DAY_MS);
      } else {
        break;
      }
    }

    // Longest streak ever: scan the unique days in ascending order.
    const daysAsc = [...daysDesc].reverse();
    let longestStreak = daysAsc.length ? 1 : 0;
    let run = 1;
    for (let i = 1; i < daysAsc.length; i++) {
      const diffDays = (new Date(daysAsc[i]) - new Date(daysAsc[i - 1])) / ONE_DAY_MS;
      run = diffDays === 1 ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
    }

    res.json({ totalAttempts, bestScorePct, averagePct, currentStreak, longestStreak });
  } catch (err) { next(err); }
};
