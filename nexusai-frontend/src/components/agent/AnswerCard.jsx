import { useState } from 'react';
import { ExternalLink, ChevronDown, CheckCircle2, XCircle, Clock, Wrench, ThumbsUp, ThumbsDown, Bookmark, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import QuizCard from './QuizCard';
import { toolLabel, isSafeUrl, seconds, argsPreview } from './agentUi';

const sectionLabel = { fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };

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
    <div style={{ marginTop: 14 }}>
      <div style={sectionLabel}>Trace</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {trace.map((t) => (
          <div key={t.round} style={{ fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text2)' }}>
              <span>Model call {t.round}{t.model ? ` · ${t.model}` : ''}</span>
              <span>{seconds(t.ms)}{t.tokens ? ` · ${t.tokens} tokens` : ''}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, marginTop: 3 }}>
              <div style={{ height: 6, width: `${Math.max((t.ms / slowest) * 100, 2)}%`, background: 'var(--green)', borderRadius: 3 }} />
            </div>
            {result.steps.filter((s) => s.round === t.round).map((s, i) => (
              <div key={i} style={{ marginLeft: 14, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--text3)' }}>
                  <span>↳ {toolLabel(s.tool)}</span>
                  <span>{s.ms}ms</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, marginTop: 2 }}>
                  <div style={{ height: 4, width: `${Math.max((s.ms / slowest) * 100, 2)}%`, background: s.ok ? 'var(--text3)' : 'var(--red)', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {result.meta?.models?.length > 1 && (
        <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8 }}>
          The main model was unavailable, so the backup model finished this answer.
        </p>
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

  return (
    <div className="card card-featured">
      <p style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{renderInline(result.answer)}</p>

      {result.meta?.format === 'plain' && (
        <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8 }}>
          The AI replied in an unexpected format, so no sources could be verified.
        </p>
      )}
      {result.meta?.stoppedReason !== 'answered' && (
        <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 8 }}>
          The agent hit its {result.meta?.stoppedReason === 'timeout' ? 'time' : 'step'} limit before finishing.
        </p>
      )}

      {/* Sources */}
      {result.sources?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={sectionLabel}>Sources</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {result.sources.filter((s) => isSafeUrl(s.url)).map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--green)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ExternalLink size={13} /> {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quiz the agent generated */}
      {result.quiz && <QuizCard quiz={result.quiz} />}

      {/* Actions the agent PROPOSED: nothing happens until the user confirms */}
      {result.pendingActions?.map((action) => {
        const state = actions[action.articleId];
        if (state === 'dismissed') return null;
        return (
          <div key={action.articleId} style={{ marginTop: 14, background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Bookmark size={15} color="var(--green)" />
            <span style={{ fontSize: 13, flex: 1, minWidth: 180 }}>Save “{action.title}” to your saved articles?</span>
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

      {/* Suggested next questions */}
      {result.followUps?.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {result.followUps.map((f) => (
            <button key={f} type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onFollowUp(f)}>
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Feedback */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Was this helpful?</span>
        <button type="button" className="btn btn-ghost btn-sm" aria-label="Helpful" aria-pressed={rating === 'up'} onClick={() => rate('up')}
          style={rating === 'up' ? { color: 'var(--green)', borderColor: 'var(--green)' } : undefined}>
          <ThumbsUp size={14} />
        </button>
        <button type="button" className="btn btn-ghost btn-sm" aria-label="Not helpful" aria-pressed={rating === 'down'} onClick={() => rate('down')}
          style={rating === 'down' ? { color: 'var(--red)', borderColor: 'var(--red)' } : undefined}>
          <ThumbsDown size={14} />
        </button>
      </div>

      {/* Steps taken + trace — the part that visibly shows it's an agent */}
      <details style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, listStyle: 'none' }}>
          <ChevronDown size={14} />
          Steps taken ({result.steps.length} tool call{result.steps.length === 1 ? '' : 's'}
          {result.meta ? ` · ${result.meta.rounds} model call${result.meta.rounds === 1 ? '' : 's'} · ${seconds(result.meta.durationMs)}` : ''})
        </summary>

        {result.steps.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>The AI answered without using any tools.</p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gap: 8 }}>
            {result.steps.map((s, i) => (
              <li key={i} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text3)' }}>{i + 1}.</span>
                  <Wrench size={13} color="var(--text2)" />
                  <strong>{toolLabel(s.tool)}</strong>
                  {s.ok ? <CheckCircle2 size={14} color="var(--green)" /> : <XCircle size={14} color="var(--red)" />}
                  <span style={{ marginLeft: 'auto', color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {s.ms}ms
                  </span>
                </div>
                {s.args && Object.keys(s.args).length > 0 && (
                  <div style={{ color: 'var(--text3)', marginTop: 4, wordBreak: 'break-word' }}>{argsPreview(s.args)}</div>
                )}
                <div style={{ color: s.ok ? 'var(--text2)' : 'var(--red)', marginTop: 4 }}>→ {s.summary}</div>
              </li>
            ))}
          </ol>
        )}

        <TraceView result={result} />
        {result.meta?.totalTokens > 0 && (
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>{result.meta.totalTokens} tokens used</p>
        )}
      </details>

    </div>
  );
}
