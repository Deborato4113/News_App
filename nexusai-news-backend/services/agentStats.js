// Pure function: turns a list of AgentRun records into the numbers shown on
// the analytics panel. Kept free of database code so it is trivially testable.
// runs: [{ status, steps, durationMs, totalTokens, toolsUsed, feedback }]
function computeStats(runs) {
  const totalRuns = runs.length;
  if (!totalRuns) {
    return {
      totalRuns: 0, avgDurationMs: 0, avgSteps: 0, avgTokens: 0,
      successRate: 0, topTools: [], statusCounts: {},
      feedback: { up: 0, down: 0, rated: 0, satisfactionPct: null },
    };
  }

  const avg = (pick) => Math.round(runs.reduce((sum, r) => sum + (pick(r) || 0), 0) / totalRuns);

  const toolCounts = new Map();
  const statusCounts = {};
  let up = 0;
  let down = 0;
  for (const r of runs) {
    if (r.feedback === 'up') up += 1;
    if (r.feedback === 'down') down += 1;
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    for (const t of r.toolsUsed || []) toolCounts.set(t, (toolCounts.get(t) || 0) + 1);
  }

  return {
    totalRuns,
    avgDurationMs: avg((r) => r.durationMs),
    // "steps" = tool calls per question; one decimal so 1.4 doesn't show as 1.
    avgSteps: Math.round((runs.reduce((s, r) => s + (r.steps || 0), 0) / totalRuns) * 10) / 10,
    avgTokens: avg((r) => r.totalTokens),
    successRate: Math.round(((statusCounts.ok || 0) / totalRuns) * 100),
    topTools: [...toolCounts.entries()]
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    statusCounts,
    // Share of RATED answers that got a thumbs up (null until someone rates one).
    feedback: { up, down, rated: up + down, satisfactionPct: up + down ? Math.round((up / (up + down)) * 100) : null },
  };
}

module.exports = { computeStats };
