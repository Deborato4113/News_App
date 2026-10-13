// Small shared helpers for the Ask NexusAI screens (no JSX in here).

// Friendly labels for the raw tool names the backend reports.
export const TOOL_LABELS = {
  search_news: 'Search news',
  get_article: 'Read article details',
  get_quiz_history: 'Check quiz history',
  generate_quiz: 'Generate quiz',
  compare_regions: 'Compare regions',
  daily_briefing: 'Daily briefing',
  bookmark_article: 'Propose saving an article',
};
export const toolLabel = (name) => TOOL_LABELS[name] || name;

// What to show while a tool is running ("Searching the news…").
const TOOL_PROGRESS = {
  search_news: 'Searching the news',
  get_article: 'Reading the article',
  get_quiz_history: 'Checking your quiz history',
  generate_quiz: 'Writing a quiz',
  compare_regions: 'Comparing the regions',
  daily_briefing: 'Building your briefing',
  bookmark_article: 'Preparing to save the article',
};
export const toolProgressLabel = (name) => TOOL_PROGRESS[name] || `Running ${name}`;

// Only ever render http(s) links, even though the backend already enforces it.
export const isSafeUrl = (u) => /^https?:\/\//i.test(u || '');

export const seconds = (ms) => `${((ms || 0) / 1000).toFixed(1)}s`;

export function argsPreview(args) {
  if (!args) return '';
  return Object.entries(args).map(([k, v]) => `${k}: ${v}`).join(' · ');
}

// Folds one live event from the server into the progress list shown while
// the agent is working. Pure: returns a new array.
//   model_start → a "thinking" row      model_done → finishes that row
//   tool_start  → a "running tool" row  tool_done  → finishes that row
export function applyEvent(progress, evt) {
  switch (evt.type) {
    case 'model_start':
      return [...progress, { kind: 'model', round: evt.round, done: false }];
    case 'model_done':
      return progress.map((p) => (p.kind === 'model' && p.round === evt.round
        ? { ...p, done: true, ms: evt.ms, tokens: evt.tokens, model: evt.model }
        : p));
    case 'tool_start':
      return [...progress, { kind: 'tool', round: evt.round, tool: evt.tool, done: false }];
    case 'tool_done': {
      // finish the most recent still-running row for this tool
      let idx = -1;
      progress.forEach((p, i) => { if (p.kind === 'tool' && p.tool === evt.tool && !p.done) idx = i; });
      if (idx === -1) return progress;
      return progress.map((p, i) => (i === idx ? { ...p, done: true, step: evt.step } : p));
    }
    default:
      return progress;
  }
}

// The last few finished turns, in the shape the server expects, so a
// follow-up question like "and Delhi?" makes sense to the AI.
export function buildHistory(thread, maxTurns = 3) {
  const done = thread.filter((t) => t.status === 'done' && t.result?.answer);
  return done.slice(-maxTurns).flatMap((t) => [
    { role: 'user', content: t.question.slice(0, 1500) },
    { role: 'assistant', content: t.result.answer.slice(0, 1500) },
  ]);
}
