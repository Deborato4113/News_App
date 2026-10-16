import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

const QUESTION = "What's the latest news in Mumbai?";
const STEPS = ['Searching Mumbai news', '4 articles found'];
const ANSWER = "Here are the main stories from Mumbai, newest first. Each point links to the article it came from, so you can check it.";
const SOURCES = ['[1] Source article', '[2] Source article'];

const START = { q: 0, steps: 0, a: 0, sources: 0 };
const END = { q: QUESTION.length, steps: STEPS.length, a: ANSWER.length, sources: SOURCES.length };

// The one animated moment on the landing page: the question types itself,
// the agent's steps tick off, the answer streams in, sources appear.
export default function HeroDemo() {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [s, setS] = useState(reduce ? END : START);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const ticker = (from, key, length, every) => {
      for (let i = 1; i <= length; i += 1) at(from + i * every, () => setS((p) => ({ ...p, [key]: i })));
      return from + length * every;
    };
    let t = ticker(600, 'q', QUESTION.length, 38);
    t += 450;
    STEPS.forEach((_, i) => { at(t, () => setS((p) => ({ ...p, steps: i + 1 }))); t += 750; });
    t = ticker(t, 'a', ANSWER.length, 16) + 250;
    SOURCES.forEach((_, i) => { at(t, () => setS((p) => ({ ...p, sources: i + 1 }))); t += 260; });
    return () => timers.forEach(clearTimeout);
  }, [run, reduce]);

  const done = s.sources === SOURCES.length;
  const replay = () => { setS(START); setRun((r) => r + 1); };

  return (
    <>
      <div className="demo" aria-label="Example conversation">
        <div className="demo-bar"><i /><i /><i /></div>
        <div className="demo-body">
          <div className="demo-q" style={{ visibility: s.q ? 'visible' : 'hidden' }}>
            <span className={s.q < QUESTION.length ? 'caret' : ''}>{QUESTION.slice(0, s.q) || ' '}</span>
          </div>
          <div className="demo-steps">
            {STEPS.slice(0, s.steps).map((t) => (
              <span className="demo-chip ok enter" key={t}><CheckCircle2 size={11} aria-hidden="true" /> {t}</span>
            ))}
          </div>
          {s.a > 0 && (
            <div className="demo-a">
              <span className={s.a < ANSWER.length ? 'caret' : ''}>{ANSWER.slice(0, s.a)}</span>
              <div className="demo-steps" style={{ marginTop: 10, minHeight: 24 }}>
                {SOURCES.slice(0, s.sources).map((t) => <span className="demo-chip enter" key={t}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
      {done && !reduce && (
        <button type="button" className="demo-replay" onClick={replay}><RotateCcw size={13} aria-hidden="true" /> Replay</button>
      )}
    </>
  );
}
