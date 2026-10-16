import { useState } from 'react';
import { ChevronDown, Check, X, Brain, Wrench, ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import QuizCard from './QuizCard';
import { toolLabel, isSafeUrl, seconds, argsPreview } from './agentUi';

// The AI sometimes writes **bold**. Show it as bold instead of literal
// asterisks, without ever injecting HTML (text stays text).
function renderInline(text) {
  return String(text ?? '').split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  );
}

// Per-model-call timing bars, with the tool calls made in that round.
function TraceView({ result }) {
  const trace = result.meta?.trace || [];
  if (!trace.length) return null;
  const slowest = Math.max(...trace.map((t) => t.ms), ...result.steps.map((s) => s.ms), 1);

  return (
    <div style={{ marginTop: 18 }}>
      <div className="ans-label" style={{ marginTop: 0 }}>Timing</div>
      <ol className="tl">
        {trace.map((t, n) => (
          <li key={t.round} className="tl-item" style={{ '--i': n }}>
            <span className="tl-dot ok"><Brain size={12} /></span>
            <div className="tl-main">
              <span className="tl-ms">{seconds(t.ms)}{t.tokens ? ` · ${t.tokens} tokens` : ''}</span>
              Model call {t.round}{t.model ? <small>{t.model}</small> : null}
              <div className="tbar"><i style={{ '--w': `${Math.max((t.ms / slowest) * 100, 2)}%` }} /></div>
              {result.steps.filter((s) => s.round === t.round).map((s, i) => (
                <div key={i} style={{ marginTop: 8 }}>
                  <span className="tl-ms">{s.ms}ms</span>
                  <span style={{ color: 'var(--text2)', fontSize: 13 }}>↳ {toolLabel(s.tool)}</span>
                  <div className={`tbar sub ${s.ok ? '' : 'bad'}`}><i style={{ '--w': `${Math.max((s.ms / slowest) * 100, 2)}%` }} /></div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {result.meta?.models?.length > 1 && (
        <p className="ans-note">The main model was unavailable, so the backup model finished this answer.</p>
      )}
    </div>
  );
}

// One finished question and its answer, with everything the agent produced.
export default function AnswerCard({ turn, onFollowUp, onRated, busy }) {
  const { result } = turn;
  const [rating, setRating] = useState(null);       // 'up' | 'down' | null
  const [actions, setActions] = useState({});       // articleId -> 'saving' | 'saved' | 'dismissed'

  async function rate(value) {
    const next = rating === value ? 'none' : value; // pressing the same button again clears it
    const previous = rating;
    setRating(next === 'none' ? null : next);
    if (!result.runId) return;
    try {
      await api.patch(`/agent/runs/${result.runId}/feedback`, { rating: next });
      onRated?.();
    } catch {
      setRating(previous);
      toast.error('Could not save your feedback.');
    }
  }

  async function confirm(action) {
    setActions((a) => ({ ...a, [action.articleId]: 'saving' }));
    try {
      await api.post('/agent/actions/bookmark', { articleId: action.articleId });
      setActions((a) => ({ ...a, [action.articleId]: 'saved' }));
    } catch {
      setActions((a) => ({ ...a, [action.articleId]: undefined }));
      toast.error('Could not save that article.');
    }
  }

  const safeSources = (result.sources || []).filter((s) => isSafeUrl(s.url));

  return (
    <div className="card card-featured ans">
      <p className="ans-text">{renderInline(result.answer)}</p>

      {result.meta?.format === 'plain' && (
        <p className="ans-note">The AI replied in an unexpected format, so no sources could be verified.</p>
      )}
      {result.meta?.stoppedReason !== 'answered' && (
        <p className="ans-note">
          The agent hit its {result.meta?.stoppedReason === 'timeout' ? 'time' : 'step'} limit before finishing.
        </p>
      )}

      {safeSources.length > 0 && (
        <>
          <div className="ans-label">Sources</div>
          <div className="src-row">
            {safeSources.map((s, i) => (
              <a key={s.url} className="src" href={s.url} target="_blank" rel="noopener noreferrer" title={s.title || s.url}>
                <b>{i + 1}</b><span>{s.title || s.url}</span>
              </a>
            ))}
          </div>
        </>
      )}

      {result.quiz && <QuizCard quiz={result.quiz} />}

      {/* Actions the agent PROPOSED: nothing happens until the user confirms */}
      {result.pendingActions?.map((action) => {
        const state = actions[action.articleId];
        if (state === 'dismissed') return null;
        return (
          <div key={action.articleId} className="propose">
            <Bookmark size={15} color="var(--green)" />
            <span>Save “{action.title}” to your saved articles?</span>
            {state === 'saved' ? (
              <span style={{ fontSize: 13, color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Saved</span>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-sm" disabled={state === 'saving'} onClick={() => confirm(action)}>
                  {state === 'saving' ? 'Saving…' : 'Confirm'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={state === 'saving'} onClick={() => setActions((a) => ({ ...a, [action.articleId]: 'dismissed' }))}>
                  Dismiss
                </button>
              </>
            )}
          </div>
        );
      })}

      {result.followUps?.length > 0 && (
        <div className="followups">
          {result.followUps.map((f) => (
            <button key={f} type="button" className="chip" disabled={busy} onClick={() => onFollowUp(f)}>{f}</button>
          ))}
        </div>
      )}

      <div className="rate">
        <span>Was this helpful?</span>
        <button type="button" className={`btn btn-ghost btn-sm ${rating === 'up' ? 'on-up' : ''}`} aria-label="Helpful" aria-pressed={rating === 'up'} onClick={() => rate('up')}>
          <ThumbsUp size={14} />
        </button>
        <button type="button" className={`btn btn-ghost btn-sm ${rating === 'down' ? 'on-down' : ''}`} aria-label="Not helpful" aria-pressed={rating === 'down'} onClick={() => rate('down')}>
          <ThumbsDown size={14} />
        </button>
      </div>

      {/* Steps taken + trace: the part that visibly shows it's an agent */}
      <details className="trace">
        <summary className="trace-sum">
          <ChevronDown size={14} />
          Steps taken ({result.steps.length} tool call{result.steps.length === 1 ? '' : 's'}
          {result.meta ? ` · ${result.meta.rounds} model call${result.meta.rounds === 1 ? '' : 's'} · ${seconds(result.meta.durationMs)}` : ''})
        </summary>

        {result.steps.length === 0 ? (
          <p className="meta" style={{ marginTop: 10 }}>The AI answered without using any tools.</p>
        ) : (
          <ol className="tl" style={{ marginTop: 14 }}>
            {result.steps.map((s, i) => (
              <li key={i} className="tl-item" style={{ '--i': i }}>
                <span className={`tl-dot ${s.ok ? 'ok' : 'bad'}`}>{s.ok ? <Check size={12} /> : <X size={12} />}</span>
                <div className="tl-main">
                  <span className="tl-ms">{s.ms}ms</span>
                  <Wrench size={12} style={{ marginRight: 6, verticalAlign: '-1px', color: 'var(--text3)' }} />
                  <strong>{toolLabel(s.tool)}</strong>
                  {s.args && Object.keys(s.args).length > 0 && <small>{argsPreview(s.args)}</small>}
                  <small style={{ color: s.ok ? 'var(--text2)' : 'var(--red)' }}>→ {s.summary}</small>
                </div>
              </li>
            ))}
          </ol>
        )}

        <TraceView result={result} />
        {result.meta?.totalTokens > 0 && <p className="meta" style={{ marginTop: 12 }}>{result.meta.totalTokens} tokens used</p>}
      </details>
    </div>
  );
}
