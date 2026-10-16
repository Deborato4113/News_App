import { useState, useEffect, useRef } from 'react';
import { BrainCircuit, CheckCircle2, XCircle, RotateCcw, Trophy, Flame, Target, History, Sparkles, Lightbulb } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import useCountUp from '../hooks/useCountUp';

const DEFAULT_REGIONS = ['mumbai','delhi','bangalore','london','newyork','singapore','jalpaiguri'];

function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem('nexusai_history') || '[]'); } catch { return []; }
}

export default function Quiz() {
  const [region,    setRegion]    = useState('mumbai');
  const [regions,   setRegions]   = useState(DEFAULT_REGIONS);

  useEffect(() => {
    function updateRegions() {
      const history = getSearchHistory();
      const combined = [...new Set([...history.map(h => h.toLowerCase()), ...DEFAULT_REGIONS])];
      setRegions(combined);
    }
    updateRegions();
    window.addEventListener('storage', updateRegions);
    return () => window.removeEventListener('storage', updateRegions);
  }, []);
  const [count,     setCount]     = useState(5);
  const [questions, setQuestions] = useState([]);
  const [answers,   setAnswers]   = useState({});   // { index: 'A' }
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const [stats, setStats]         = useState(null);
  const [recording, setRecording] = useState(false);

  // Plain (non-effect) function, reused after a quiz submission to refresh
  // the panel with the new attempt included.
  async function loadStats() {
    try {
      const r = await api.get('/quiz/stats');
      setStats(r.data);
    } catch { /* stats are a nice-to-have — fail silently */ }
  }

  // Initial load on mount — inlined rather than calling loadStats()
  // directly so a cancelled-unmount guard is in place before the first
  // setState.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.get('/quiz/stats');
        if (!cancelled) setStats(r.data);
      } catch { /* stats are a nice-to-have — fail silently */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function generateQuiz() {
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    try {
      const r = await api.post('/ai/quiz', { region, count });
      setQuestions(r.data.questions);
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to generate quiz.';
      toast.error(msg);
    }
    setLoading(false);
  }

  function pick(idx, letter) {
    if (submitted) return;
    setAnswers(a => ({ ...a, [idx]: letter }));
  }

  async function submit() {
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions first!');
      return;
    }
    setSubmitted(true);

    const finalScore = questions.filter((q, i) => answers[i] === q.answer).length;
    setRecording(true);
    try {
      await api.post('/quiz/attempts', { region, score: finalScore, total: questions.length });
      loadStats(); // refresh streak/best-score panel with this attempt included
    } catch {
      // Recording the attempt failing shouldn't block seeing the score.
    }
    setRecording(false);
  }

  function reset() {
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
  }

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.answer).length
    : 0;

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const answered = Object.keys(answers).length;
  const tone = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
  const shownScore = useCountUp(score, 900);
  const cardRefs = useRef([]);

  function jumpTo(i) {
    cardRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const R = 64;
  const C = 2 * Math.PI * R;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <PageHeader
        icon={BrainCircuit}
        title="Current Affairs Quiz"
        sub="AI-written questions from the headlines already cached for a region."
      />

      {stats && stats.totalAttempts > 0 && !loading && questions.length === 0 && (
        <div className="quiz-stats reveal-list">
          <QuizStat i={0} label="Streak" icon={<Flame size={16} />} color="var(--amber)" value={stats.currentStreak} suffix="d" />
          <QuizStat i={1} label="Best" icon={<Trophy size={16} />} color="var(--green)" value={stats.bestScorePct} suffix="%" />
          <QuizStat i={2} label="Average" icon={<Target size={16} />} color="var(--blue)" value={stats.averagePct} suffix="%" />
          <QuizStat i={3} label="Attempts" icon={<History size={16} />} value={stats.totalAttempts} />
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="card">
          <div className="setup">
            <div>
              <label className="label" htmlFor="quiz-region">Region</label>
              <select id="quiz-region" className="input" value={region} onChange={e => setRegion(e.target.value)} style={{ appearance: 'auto' }}>
                {regions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <span className="label">Questions</span>
              <div className="seg" role="group" aria-label="Number of questions">
                {[3, 5, 7, 10].map(n => (
                  <button key={n} type="button" className={count === n ? 'on' : ''} aria-pressed={count === n} onClick={() => setCount(n)}>{n}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={generateQuiz}>
              <Sparkles size={15} /> Generate quiz
            </button>
          </div>
          <p className="meta" style={{ marginTop: 14 }}>
            Tip: load a region on the Dashboard first, so the quiz has articles to draw from.
          </p>
        </div>
      )}

      {loading && (
        <div className="sk-list" aria-busy="true" aria-label="Generating quiz">
          <p className="meta" style={{ textAlign: 'center', padding: '0.5rem 0 0.75rem' }}>
            <span className="spinner-dark" style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Writing {count} questions from today's headlines…
          </p>
          {Array.from({ length: Math.min(count, 3) }, (_, i) => (
            <div className="sk-card" key={i}>
              <div className="skeleton sk-line" style={{ width: '70%', height: 16 }} />
              <div className="skeleton sk-line" style={{ height: 38 }} />
              <div className="skeleton sk-line" style={{ height: 38 }} />
              <div className="skeleton sk-line" style={{ height: 38 }} />
            </div>
          ))}
        </div>
      )}

      {submitted && (
        <div className="card result">
          <div className="ring" aria-label={`Score ${score} of ${questions.length}`}>
            <svg width="148" height="148" viewBox="0 0 148 148">
              <circle className="track" cx="74" cy="74" r={R} />
              <circle className="fill" cx="74" cy="74" r={R} stroke={tone}
                style={{ '--c': C, '--t': C * (1 - pct / 100) }} />
            </svg>
            <div className="ring-n">
              <b style={{ color: tone }}>{shownScore}/{questions.length}</b>
              <span>{pct}%</span>
            </div>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>
            {pct >= 80 ? "Excellent. You're well informed." : pct >= 50 ? 'Good job. Keep reading.' : 'Time to catch up on the news.'}
          </p>
          {recording && <p className="meta" style={{ marginTop: 8 }}>Saving your result…</p>}
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={reset}>
            <RotateCcw size={14} /> Try another quiz
          </button>
        </div>
      )}

      {questions.length > 0 && (
        <>
          <div className="qprog">
            <div className="qprog-top">
              <span>{submitted ? 'Review your answers' : `${answered} of ${questions.length} answered`}</span>
              {!submitted && <span>{Math.round((answered / questions.length) * 100)}%</span>}
            </div>
            <div className="qbar"><i style={{ width: `${(answered / questions.length) * 100}%` }} /></div>
            <div className="qdots">
              {questions.map((q, i) => {
                const cls = submitted ? (answers[i] === q.answer ? 'right' : 'wrong') : answers[i] ? 'done' : '';
                return <button key={i} className={`qdot ${cls}`} onClick={() => jumpTo(i)} aria-label={`Go to question ${i + 1}`}>{i + 1}</button>;
              })}
            </div>
          </div>

          <div className="grid-list" style={{ gap: 14 }}>
            {questions.map((q, i) => {
              const userAns = answers[i];
              return (
                <div key={i} className="card qcard" ref={el => { cardRefs.current[i] = el; }} style={{ animation: 'rise 0.4s var(--ease) both', animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                  <h3><span>Q{i + 1}</span>{q.question}</h3>
                  <div className="opts" role="radiogroup" aria-label={`Question ${i + 1}`}>
                    {q.options.map(opt => {
                      const letter = opt[0];
                      const isChosen = userAns === letter;
                      const isCorrect = letter === q.answer;
                      let cls = '';
                      if (submitted) cls = isCorrect ? 'right' : isChosen ? 'wrong' : 'dim';
                      else if (isChosen) cls = 'chosen';
                      return (
                        <button key={letter} role="radio" aria-checked={isChosen} disabled={submitted}
                          className={`opt ${cls}`} onClick={() => pick(i, letter)}>
                          <span className="opt-l">
                            {submitted && isCorrect ? <CheckCircle2 size={15} /> : submitted && isChosen ? <XCircle size={15} /> : letter}
                          </span>
                          {opt.slice(3)}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.explanation && (
                    <p className="why"><Lightbulb size={13} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--green)' }} />{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sticky-submit">
            {!submitted ? (
              <button className="btn btn-primary btn-lg" onClick={submit}>
                Submit answers ({answered}/{questions.length})
              </button>
            ) : (
              <button className="btn btn-primary" onClick={reset}><RotateCcw size={14} /> New quiz</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QuizStat({ label, icon, color, value, suffix = '', i }) {
  const n = useCountUp(value);
  return (
    <div className="qs" style={{ '--i': i }}>
      <div className="qs-l">{label}</div>
      <div className="qs-v" style={{ color }}>{icon}{n}{suffix}</div>
    </div>
  );
}
