// The fixed question set the agent is graded on (`npm run eval`).
//
//   expectTools   every one of these tools must be called
//   forbidTools   none of these may be called
//   expectNoTools the agent should answer without any tool (small talk)
//   mustCite      the answer should carry at least one source link; only
//                 counted when a search actually found articles, so an empty
//                 database doesn't unfairly lower the score
//
// Keep it fixed: numbers are only comparable between runs if the questions
// don't change.
const CASES = [
  // ── news search ──────────────────────────────────────────────
  { id: 'news-01', category: 'news', question: 'What are the latest headlines in Mumbai?', expectTools: ['search_news'], mustCite: true },
  { id: 'news-02', category: 'news', question: 'Is there any news about flooding in Delhi?', expectTools: ['search_news'], mustCite: true },
  { id: 'news-03', category: 'news', question: "Tell me about today's top news in Kolkata", expectTools: ['search_news'], mustCite: true },
  { id: 'news-04', category: 'news', question: "What's happening with the Indian stock market?", expectTools: ['search_news'], mustCite: true },
  { id: 'news-05', category: 'news', question: 'Any news about cricket this week?', expectTools: ['search_news'], mustCite: true },
  { id: 'news-06', category: 'news', question: 'Summarise what is being reported about the elections', expectTools: ['search_news'], mustCite: true },
  { id: 'news-07', category: 'news', question: 'Find reporting on air pollution in Delhi and tell me how reliable it is', expectTools: ['search_news'], mustCite: true },
  // ── several tools in one question ────────────────────────────
  { id: 'multi-01', category: 'multi-tool', question: 'Tell me the latest Mumbai headlines and which quiz topics I should revise', expectTools: ['search_news', 'get_quiz_history'], mustCite: true },
  // ── quiz history ─────────────────────────────────────────────
  { id: 'history-01', category: 'quiz history', question: 'Which topics am I weakest at in quizzes?', expectTools: ['get_quiz_history'] },
  { id: 'history-02', category: 'quiz history', question: 'How am I doing overall on my quizzes?', expectTools: ['get_quiz_history'] },
  { id: 'history-03', category: 'quiz history', question: 'What should I study next based on my quiz results?', expectTools: ['get_quiz_history'] },
  // ── quiz generation ──────────────────────────────────────────
  { id: 'quiz-01', category: 'quiz', question: 'Quiz me on elections, medium difficulty', expectTools: ['generate_quiz'] },
  { id: 'quiz-02', category: 'quiz', question: 'Give me a hard 3-question quiz about Mumbai', expectTools: ['generate_quiz'] },
  // ── comparing regions ────────────────────────────────────────
  { id: 'compare-01', category: 'compare', question: 'Compare the news in Mumbai and Delhi', expectTools: ['compare_regions'], mustCite: true },
  { id: 'compare-02', category: 'compare', question: 'How does flooding coverage differ between Mumbai and Kolkata?', expectTools: ['compare_regions'], mustCite: true },
  // ── daily briefing ───────────────────────────────────────────
  { id: 'briefing-01', category: 'briefing', question: 'Give me my daily briefing', expectTools: ['daily_briefing'], mustCite: true },
  { id: 'briefing-02', category: 'briefing', question: 'Catch me up on what I missed', expectTools: ['daily_briefing'], mustCite: true },
  // ── saving an article (must only PROPOSE) ────────────────────
  { id: 'save-01', category: 'bookmark', question: 'Find a recent article about Mumbai and save it for me', expectTools: ['search_news', 'bookmark_article'] },
  // ── no tool needed ───────────────────────────────────────────
  { id: 'chat-01', category: 'small talk', question: 'Hi! What can you help me with?', expectNoTools: true },
  { id: 'chat-02', category: 'small talk', question: 'Thanks, that was really helpful', expectNoTools: true },
];

module.exports = { CASES };
