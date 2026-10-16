import { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Trophy } from 'lucide-react';
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

  const tone = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="agent-quiz">
      <div className="ans-label" style={{ marginTop: 0 }}>Quiz · {quiz.topic} · {quiz.difficulty}</div>

      <div className="qbar" style={{ marginBottom: 12 }}>
        <i style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {questions.map((q, i) => {
          const correct = String(q.answer || '').trim().toUpperCase().charAt(0);
          return (
            <div key={i} className="q">
              <p><span>Q{i + 1}</span>{q.question}</p>
              <div className="opts" role="radiogroup" aria-label={`Question ${i + 1}`}>
                {(q.options || []).map((opt, idx) => {
                  const letter = letterOf(idx);
                  const chosen = answers[i] === letter;
                  const isCorrect = letter === correct;
                  let cls = '';
                  if (submitted) cls = isCorrect ? 'right' : chosen ? 'wrong' : 'dim';
                  else if (chosen) cls = 'chosen';
                  return (
                    <button key={letter} type="button" role="radio" aria-checked={chosen} disabled={submitted}
                      className={`opt ${cls}`} onClick={() => setAnswers((a) => ({ ...a, [i]: letter }))}>
                      <span className="opt-l">
                        {submitted && isCorrect ? <CheckCircle2 size={13} /> : submitted && chosen ? <XCircle size={13} /> : letter}
                      </span>
                      {stripLetter(opt)}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && <p className="why">{q.explanation}</p>}
            </div>
          );
        })}
      </div>

      <div className="ph-actions" style={{ marginTop: 14, flexWrap: 'wrap' }}>
        {!submitted ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={!answeredAll}>
            Submit ({Object.keys(answers).length}/{questions.length} answered)
          </button>
        ) : (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: tone }}>
              <Trophy size={15} /> {score}/{questions.length} ({pct}%)
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={13} /> Try again</button>
            <span className="meta">
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
