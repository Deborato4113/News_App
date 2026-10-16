import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, Square, MessageSquarePlus, Sparkles } from 'lucide-react';
import api from '../api/axios';
import { streamAsk } from '../api/agentStream';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import AnswerCard from '../components/agent/AnswerCard';
import ProgressList from '../components/agent/ProgressList';
import { toolLabel, seconds, applyEvent, buildHistory } from '../components/agent/agentUi';

const MAX_LEN = 500;
const EXAMPLES = [
  'Give me my daily briefing',
  'What are the latest headlines in Mumbai?',
  'Compare the news in Mumbai and Delhi',
  'Which topics am I weakest at in quizzes?',
  'Quiz me on elections, medium difficulty',
];

// Loads the user's own agent stats, plus everyone's if they're an admin.
async function fetchStats(isAdmin) {
  const [mine, all] = await Promise.all([
    api.get('/agent/stats').then((r) => r.data),
    isAdmin ? api.get('/agent/stats/all').then((r) => r.data).catch(() => null) : Promise.resolve(null),
  ]);
  return { mine, all };
}

function Tile({ title, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--green)' }}>{value}</div>
    </div>
  );
}

function StatsPanel({ stats }) {
  if (!stats?.mine || stats.mine.totalRuns === 0) return null;

  const rows = [['Your stats', stats.mine]];
  if (stats.all) rows.push(['All users', stats.all]);

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Agent analytics
      </div>
      {rows.map(([label, s]) => (
        <div key={label} className="card" style={{ marginBottom: 10, padding: '0.9rem 1rem' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <Tile title="Questions" value={s.totalRuns} />
            <Tile title="Avg response" value={seconds(s.avgDurationMs)} />
            <Tile title="Avg tool calls" value={s.avgSteps} />
            <Tile title="Answered OK" value={`${s.successRate}%`} />
            <Tile
              title="Helpful"
              value={s.feedback?.satisfactionPct == null ? '–' : `${s.feedback.satisfactionPct}%`}
            />
          </div>
          {s.feedback?.rated > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
              Based on {s.feedback.rated} rated answer{s.feedback.rated === 1 ? '' : 's'} ({s.feedback.up} 👍 · {s.feedback.down} 👎)
            </div>
          )}
          {s.topTools.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 10 }}>
              Most used:{' '}
              {s.topTools.map((t) => `${toolLabel(t.tool)} (${t.count})`).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AskNexus() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [question, setQuestion] = useState('');
  // The conversation. Each turn: { id, question, status: 'running'|'done'|'error', progress, result?, error? }
  const [thread, setThread]     = useState([]);
  const [stats, setStats]       = useState(null);
  const abortRef  = useRef(null);
  const bottomRef = useRef(null);
  const nextId    = useRef(1);

  const loading = thread.some((t) => t.status === 'running');


  // Initial stats load — inline async with a cancelled guard (avoids
  // setState directly in the effect body).
  useEffect(() => {
    let cancelled = false;
    fetchStats(isAdmin)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => { /* analytics are a nice-to-have */ });
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Stop an in-flight question if the user leaves the page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the newest activity in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [thread]);

  function refreshStats() {
    fetchStats(isAdmin).then(setStats).catch(() => {});
  }

  const patchTurn = (id, change) =>
    setThread((t) => t.map((turn) => (turn.id === id ? { ...turn, ...(typeof change === 'function' ? change(turn) : change) } : turn)));

  async function handleAsk(e, preset) {
    e?.preventDefault();
    const q = (preset ?? question).trim();
    if (q.length < 5 || loading) return;

    const id = nextId.current;
    nextId.current += 1;
    const history = buildHistory(thread);          // earlier turns, so "and Delhi?" makes sense
    const controller = new AbortController();
    abortRef.current = controller;

    setQuestion('');
    setThread((t) => [...t, { id, question: q, status: 'running', progress: [] }]);

    try {
      const result = await streamAsk({
        question: q,
        history,
        signal: controller.signal,
        onEvent: (evt) => patchTurn(id, (turn) => ({ progress: applyEvent(turn.progress, evt) })),
      });
      patchTurn(id, { status: 'done', result });
      refreshStats();
    } catch (err) {
      if (err.name === 'AbortError') {
        patchTurn(id, { status: 'error', error: 'Stopped.' });
      } else {
        const msg = err.message || 'Something went wrong. Please try again.';
        patchTurn(id, { status: 'error', error: msg });
        if (err.status !== 401) toast.error(msg);
      }
    }
  }

  // Arrived from the quick-find box (Ctrl+K) with a question: ask it once.
  const location = useLocation();
  const autoAsked = useRef(false);
  const incoming = location.state?.ask;
  useEffect(() => {
    if (!incoming || autoAsked.current) return;
    autoAsked.current = true;           // once only (also under React StrictMode's double effect)
    setTimeout(() => handleAsk(null, incoming), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  function stop() {
    abortRef.current?.abort();
  }

  function newConversation() {
    abortRef.current?.abort();
    setThread([]);
    setQuestion('');
  }

  const tooShort = question.trim().length < 5;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Bot size={22} color="var(--green)" />
          <h1 className="display" style={{ fontSize: 26 }}>Ask NexusAI</h1>
          {thread.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={newConversation}>
              <MessageSquarePlus size={14} /> New conversation
            </button>
          )}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          Ask in plain English. The AI picks its own tools — searching news, comparing regions, building your briefing,
          checking your quiz history — and shows its work. Follow-up questions remember the conversation.
        </p>
      </div>

      {/* Conversation */}
      <div style={{ display: 'grid', gap: 16, marginBottom: '1rem' }}>
        {thread.map((turn) => (
          <div key={turn.id}>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>You asked: {turn.question}</div>

            {turn.status === 'running' && (
              <div className="card">
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>The agent is working…</div>
                <ProgressList progress={turn.progress} />
              </div>
            )}

            {turn.status === 'error' && (
              <div className="card" style={{ borderLeft: '3px solid var(--red)', color: 'var(--text2)', fontSize: 14 }}>
                {turn.error}
              </div>
            )}

            {turn.status === 'done' && (
              <AnswerCard turn={turn} busy={loading} onFollowUp={(f) => handleAsk(null, f)} onRated={refreshStats} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Example prompts (only before the first question) */}
      {thread.length === 0 && (
        <div className="prompt-chips">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="prompt-chip" onClick={() => handleAsk(null, ex)}>
              <Sparkles size={15} aria-hidden="true" /> {ex}
            </button>
          ))}
        </div>
      )}

      {/* Question box */}
      <form onSubmit={handleAsk} className="card" style={{ marginBottom: '1rem' }}>
        <textarea
          className="input"
          rows={3}
          maxLength={MAX_LEN}
          placeholder={thread.length ? 'Ask a follow-up…' : "e.g. What's the latest on flooding in Mumbai, and how reliable is the coverage?"}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk(e); }}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
          disabled={loading}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{question.length}/{MAX_LEN}</span>
          {loading ? (
            <button className="btn btn-ghost" type="button" onClick={stop}>
              <Square size={13} /> Stop
            </button>
          ) : (
            <button className="btn btn-primary" type="submit" disabled={tooShort}>
              <Send size={14} /> Ask
            </button>
          )}
        </div>
      </form>

      <StatsPanel stats={stats} />
    </div>
  );
}
