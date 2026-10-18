// Small text helpers shared by the reader drawer, the dashboard and the history page.

const WORDS_PER_MINUTE = 220;

export function wordCount(text = '') {
  const t = String(text).trim();
  return t ? t.split(/\s+/).length : 0;
}

// Estimated seconds to read a piece of text at an average adult pace.
export function readSeconds(text) {
  return Math.round((wordCount(text) / WORDS_PER_MINUTE) * 60);
}

// "20 sec read", "1 min read", "3 min read"
export function formatRead(seconds) {
  if (seconds < 45) return `${Math.max(seconds, 5)} sec read`;
  return `${Math.max(1, Math.round(seconds / 60))} min read`;
}

const STOP = new Set((
  'the a an and or but of to in on at for with by from as is are was were be been it its this that these those ' +
  'after before over under into out up down about than then they them their he she his her we our you your ' +
  'has have had will would can could may might not no new says said say amid more most also who what when ' +
  'where how why which just still one two three year years day days week today news report reports ' +
  'india indian mumbai delhi'
).split(' '));

// Most frequent meaningful words across a list of articles' titles. Used for
// the "In today's headlines" chips, so it is computed from what is on screen,
// not invented.
export function topWords(articles, limit = 6) {
  const counts = new Map();
  for (const a of articles) {
    const seen = new Set();
    for (const raw of (a.title || '').toLowerCase().split(/[^a-z0-9']+/)) {
      const w = raw.replace(/^'+|'+$/g, '');
      if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w) || seen.has(w)) continue;
      seen.add(w); // count a word once per headline
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export function sentimentMix(articles) {
  const total = articles.length;
  const n = { pos: 0, neu: 0, neg: 0 };
  for (const a of articles) if (n[a.sentiment] !== undefined) n[a.sentiment] += 1;
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  return { total, ...n, posPct: pct(n.pos), neuPct: pct(n.neu), negPct: pct(n.neg) };
}

export function titleCase(s = '') {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
