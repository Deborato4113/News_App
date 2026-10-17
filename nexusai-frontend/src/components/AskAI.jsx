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
    <section className="askai" aria-label="Ask AI about today's news">
      <div className="askai-head">
        <Bot size={16} aria-hidden="true" />
        <span>Ask AI about today's news</span>
      </div>
      <div className="askai-row">
        <input
          className="input"
          aria-label="Your question"
          placeholder={`e.g. What happened in ${region} today?`}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
        />
        <button className="btn btn-primary" onClick={ask} disabled={loading || !question.trim()} aria-label="Ask">
          {loading ? <div className="spinner" /> : <Send size={15} />}
        </button>
      </div>

      {answer && (
        <div className="askai-answer" aria-live="polite">
          <div className="ans-label">AI Answer</div>
          <p>{answer}</p>
        </div>
      )}
    </section>
  );
}
