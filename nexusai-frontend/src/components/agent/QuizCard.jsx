import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react';
import api from '../../api/axios';

// An interactive quiz the agent generated. The questions come from the
// server's own tool result (not from text the AI wrote). Finishing it records
// an attempt through the same endpoint as the Quiz page, so it counts toward
// your streak and "weak topics".
const letterOf = (i) => String.fromCharCode(65 + i);
const stripLetter = (opt) => String(opt).replace(/^\s*[A-D][).:]\s*/i, '');

export default function QuizCard({ quiz }) {
  const questions = quiz.questions || [];
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | failed

  const score = questions.filter((q, i) => answers[i] === String(q.answer || '').trim().toUpperCase().charAt(0)).length;
  const answeredAll = questions.length > 0 && Object.keys(answers).length === questions.length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  async function submit() {
    if (!answeredAll || submitted) return;
    setSubmitted(true);
    setSaveState('saving');
    try {
      await api.post('/quiz/attempts', { region: String(quiz.topic).slice(0, 60), score, total: questions.length });
      setSaveState('saved');
    } catch {
      setSaveState('failed'); // seeing the score matters more than recording it
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    setSaveState('idle');
  }

  if (!questions.length) return null;

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        Quiz · {quiz.topic} · {quiz.difficulty}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {questions.map((q, i) => {
          const correct = String(q.answer || '').trim().toUpperCase().charAt(0);
          return (
            <div key={i} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, lineHeight: 1.5 }}>
                <span style={{ color: 'var(--green)', marginRight: 6 }}>Q{i + 1}.</span>{q.question}
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {(q.options || []).map((opt, idx) => {
                  const letter = letterOf(idx);
                  const chosen = answers[i] === letter;
                  const isCorrect = letter === correct;
                  let border = 'var(--border)';
                  let color = 'var(--text)';
                  let bg = 'var(--bg)';
                  if (submitted) {
                    if (isCorrect) { bg = '#14352a'; border = 'var(--green)'; color = '#5DCAA5'; }
                    else if (chosen) { bg = '#3d1a1a'; border = 'var(--red)'; color = '#f08080'; }
                  } else if (chosen) { border = 'var(--green)'; color = 'var(--green)'; }
                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: letter }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 'var(--radius)', background: bg, border: `1px solid ${border}`, color,
                        cursor: submitted ? 'default' : 'pointer', fontSize: 13, textAlign: 'left',
                      }}
                    >
                      {submitted && isCorrect ? <CheckCircle size={14} color="var(--green)" />
                        : submitted && chosen ? <XCircle size={14} color="var(--red)" />
                        : <span style={{ width: 20, height: 20, borderRadius: '50%', border: `1px solid ${border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{letter}</span>}
                      {stripLetter(opt)}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, lineHeight: 1.6 }}>💡 {q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {!submitted ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={!answeredAll}>
            Submit ({Object.keys(answers).length}/{questions.length} answered)
          </button>
        ) : (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)' }}>
              <Trophy size={15} /> {score}/{questions.length} ({pct}%)
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={13} /> Try again</button>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>
              {saveState === 'saving' && 'Saving your result…'}
              {saveState === 'saved' && 'Saved to your quiz history.'}
              {saveState === 'failed' && 'Could not save this result.'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
