import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

// Example conversations the visitor can switch between. They are scripted
// (the window says so); the real thing is one signup away.
const SCENARIOS = [
  {
    id: 'latest', label: 'Latest news',
    q: "What's the latest news in Mumbai?",
    steps: ['Searching Mumbai news', 'Articles found'],
    a: 'Here are the main stories from Mumbai, newest first. Each point links to the article it came from, so you can check it.',
    sources: ['[1] Source article', '[2] Source article'],
  },
  {
    id: 'compare', label: 'Compare cities',
    q: 'Compare the news in Mumbai and Delhi',
    steps: ['Searching Mumbai news', 'Searching Delhi news', 'Comparing the regions'],
    a: 'Mumbai leans towards transport and civic stories, Delhi towards politics. Every claim links to the article behind it.',
    sources: ['[1] Mumbai article', '[2] Delhi article', '[3] Delhi article'],
  },
  {
    id: 'quiz', label: 'Quiz me',
    q: 'Quiz me on elections, medium difficulty',
    steps: ['Checking your quiz history', 'Writing a quiz'],
    a: 'Here is a short quiz on elections. Answer it right in the chat and your score counts towards your streak.',
    sources: ['[1] Source article'],
  },
  {
    id: 'save', label: 'Save for later',
    q: 'Save the first story for later',
    steps: ['Finding the article', 'Preparing to save'],
    a: "I've proposed saving it. Nothing is stored in your account until you press Confirm.",
    sources: ['Waiting for your Confirm'],
  },
];

const empty = { q: 0, steps: 0, a: 0, sources: 0 };
const full = (sc) => ({ q: sc.q.length, steps: sc.steps.length, a: sc.a.length, sources: sc.sources.length });

// The animated moment on the landing page: the question types itself, the
// agent's steps tick off, the answer streams in, sources appear. Pick another
// example with the chips above the window.
export default function HeroDemo() {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [idx, setIdx] = useState(0);
  const sc = SCENARIOS[idx];
  const [s, setS] = useState(reduce ? full(SCENARIOS[0]) : empty);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const scene = SCENARIOS[idx];
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const ticker = (from, key, length, every) => {
      for (let i = 1; i <= length; i += 1) at(from + i * every, () => setS((p) => ({ ...p, [key]: i })));
      return from + length * every;
    };
    let t = ticker(500, 'q', scene.q.length, 34);
    t += 420;
    scene.steps.forEach((_, i) => { at(t, () => setS((p) => ({ ...p, steps: i + 1 }))); t += 650; });
    t = ticker(t, 'a', scene.a.length, 14) + 220;
    scene.sources.forEach((_, i) => { at(t, () => setS((p) => ({ ...p, sources: i + 1 }))); t += 240; });
    return () => timers.forEach(clearTimeout);
  }, [idx, run, reduce]);

  const done = s.sources === sc.sources.length;
  const pick = (n) => { setS(reduce ? full(SCENARIOS[n]) : empty); setIdx(n); setRun((r) => r + 1); };
  const replay = () => { setS(empty); setRun((r) => r + 1); };

  return (
    <div className="demo-wrap">
      <div className="demo-tabs" role="tablist" aria-label="Example questions">
        {SCENARIOS.map((x, n) => (
          <button key={x.id} type="button" role="tab" aria-selected={n === idx}
            className={`chip${n === idx ? ' active' : ''}`} onClick={() => pick(n)}>{x.label}</button>
        ))}
      </div>

      <div className="demo" aria-label="Example conversation" aria-live="off">
        <div className="demo-bar"><i /><i /><i /><span className="demo-tag">Example conversation</span></div>
        <div className="demo-body">
          <div className="demo-q" style={{ visibility: s.q ? 'visible' : 'hidden' }}>
            <span className={s.q < sc.q.length ? 'caret' : ''}>{sc.q.slice(0, s.q) || ' '}</span>
          </div>
          <div className="demo-steps">
            {sc.steps.slice(0, s.steps).map((t) => (
              <span className="demo-chip ok enter" key={`${sc.id}-${t}`}><CheckCircle2 size={11} aria-hidden="true" /> {t}</span>
            ))}
          </div>
          {s.a > 0 && (
            <div className="demo-a">
              <span className={s.a < sc.a.length ? 'caret' : ''}>{sc.a.slice(0, s.a)}</span>
              <div className="demo-steps" style={{ marginTop: 10, minHeight: 24 }}>
                {sc.sources.slice(0, s.sources).map((t) => <span className="demo-chip enter" key={`${sc.id}-${t}`}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
      {done && !reduce && (
        <button type="button" className="demo-replay" onClick={replay}><RotateCcw size={13} aria-hidden="true" /> Replay</button>
      )}
    </div>
  );
}
