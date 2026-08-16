import { useState } from 'react';
import { BrainCircuit, CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const REGIONS = ['mumbai','delhi','bangalore','london','newyork','singapore'];

export default function Quiz() {
  const [region,    setRegion]    = useState('mumbai');
  const [count,     setCount]     = useState(5);
  const [questions, setQuestions] = useState([]);
  const [answers,   setAnswers]   = useState({});   // { index: 'A' }
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

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

  function submit() {
    if (Object.keys(answers).length < questions.length) {
      toast.error('Please answer all questions first!');
      return;
    }
    setSubmitted(true);
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

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <BrainCircuit size={22} color="var(--green)" />
          <h1 className="display" style={{ fontSize: 26 }}>Current Affairs Quiz</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Test your knowledge with AI-generated questions from today's headlines.
        </p>
      </div>

      {/* Controls */}
      {!loading && questions.length === 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="label">Region</label>
              <select className="input" value={region} onChange={e => setRegion(e.target.value)}
                style={{ appearance: 'auto' }}>
                {REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ width: 120 }}>
              <label className="label">Questions</label>
              <select className="input" value={count} onChange={e => setCount(Number(e.target.value))}
                style={{ appearance: 'auto' }}>
                {[3,5,7,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={generateQuiz} style={{ marginBottom: 1 }}>
              Generate Quiz
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
            ⚠️ Fetch news for this region first from the Dashboard so the quiz has content to work with.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text2)' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 1rem' }} />
          Generating quiz with Gemini AI…
        </div>
      )}

      {/* Score screen */}
      {submitted && (
        <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '2rem' }}>
          <Trophy size={36} color={pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)'}
            style={{ margin: '0 auto 0.75rem' }} />
          <div className="display" style={{ fontSize: 48, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)' }}>
            {score}/{questions.length}
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
            {pct >= 80 ? '🎉 Excellent! You\'re well informed.' : pct >= 50 ? '👍 Good job, keep reading!' : '📰 Time to catch up on the news!'}
          </p>
          <button className="btn btn-ghost" style={{ marginTop: '1.25rem' }} onClick={reset}>
            <RotateCcw size={14} /> Try another quiz
          </button>
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const correct = q.answer;

            return (
              <div key={i} className="card">
                {/* Question */}
                <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--green)', marginRight: 6 }}>Q{i+1}.</span>
                  {q.question}
                </p>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {q.options.map(opt => {
                    const letter = opt[0]; // 'A', 'B', 'C', 'D'
                    const isChosen  = userAns === letter;
                    const isCorrect = letter === correct;

                    let bg = 'var(--bg3)', border = 'var(--border)', color = 'var(--text)';
                    if (submitted) {
                      if (isCorrect)             { bg = '#14352a'; border = 'var(--green)'; color = '#5DCAA5'; }
                      else if (isChosen)         { bg = '#3d1a1a'; border = 'var(--red)';   color = '#f08080'; }
                    } else if (isChosen) {
                      bg = 'var(--bg3)'; border = 'var(--green)'; color = 'var(--green)';
                    }

                    return (
                      <button key={letter} onClick={() => pick(i, letter)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 14px', borderRadius: 'var(--radius)',
                          background: bg, border: `1px solid ${border}`, color,
                          cursor: submitted ? 'default' : 'pointer',
                          fontSize: 14, textAlign: 'left', transition: 'all 0.15s',
                        }}>
                        {submitted && isCorrect && <CheckCircle size={15} color="var(--green)" />}
                        {submitted && isChosen && !isCorrect && <XCircle size={15} color="var(--red)" />}
                        {(!submitted || (!isCorrect && !isChosen)) && (
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%', border: `1px solid ${border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 600, flexShrink: 0,
                          }}>{letter}</span>
                        )}
                        {opt.slice(3)}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation (after submit) */}
                {submitted && q.explanation && (
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 10, lineHeight: 1.6,
                    background: 'var(--bg)', borderRadius: 6, padding: '8px 12px' }}>
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            );
          })}

          {/* Submit / Reset */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {!submitted ? (
              <button className="btn btn-primary" onClick={submit}>
                Submit Answers ({Object.keys(answers).length}/{questions.length} answered)
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={reset}>
                <RotateCcw size={14} /> New Quiz
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
