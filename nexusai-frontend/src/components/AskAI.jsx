import { useState } from 'react';
import { Send, Bot } from 'lucide-react';
import api from '../api/axios';

export default function AskAI({ region }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer]     = useState('');
  const [loading, setLoading]   = useState(false);

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    try {
      const r = await api.post('/ai/ask', { question, region });
      setAnswer(r.data.answer);
    } catch {
      setAnswer('Could not get an answer. Make sure the backend is running.');
    }
    setLoading(false);
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Bot size={16} color="var(--green)" />
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
          Ask AI about today's news
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          placeholder={`e.g. What happened in ${region} today?`}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
        />
        <button className="btn btn-primary" onClick={ask} disabled={loading || !question.trim()}>
          {loading ? <div className="spinner" /> : <Send size={15} />}
        </button>
      </div>

      {answer && (
        <div style={{
          marginTop: 12, background: 'var(--bg3)', border: '1px solid var(--green-dark)',
          borderRadius: 'var(--radius)', padding: '12px 16px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI Answer
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.65 }}>{answer}</p>
        </div>
      )}
    </div>
  );
}
