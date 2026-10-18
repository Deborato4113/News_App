import { Link } from 'react-router-dom';
import { Code2, ArrowRight, Wrench, Shield, FlaskConical } from 'lucide-react';
import { EVAL } from '../data/evalResults';
import useReveal from '../hooks/useReveal';

const REPO = 'https://github.com/Deborato4113/News_App';

const STACK = [
  ['Frontend', 'React 19, Vite, React Router, plain CSS design tokens'],
  ['API', 'Node.js, Express, Zod request validation, JWT and Firebase Google sign-in'],
  ['Data', 'MongoDB with Mongoose, text indexes, TTL clean-up'],
  ['AI', 'Groq models with tool calling, a fallback model, server-sent events'],
  ['Quality', 'Jest and Supertest with an in-memory database, Vitest and Testing Library, GitHub Actions'],
  ['Hosting', 'Render for the API, Vercel for the frontend'],
];

const LOOP = [
  ['You ask', 'A question like “what happened in Kolkata this week?” goes to the agent endpoint and opens a stream.'],
  ['The model picks tools', 'It can search stored articles, fetch fresh news, summarise or build a quiz. Small talk uses no tools.'],
  ['Tools run on the server', 'Results come back to the model, which can call more tools for up to a fixed number of steps.'],
  ['Answers carry sources', 'Every claim is numbered. Links the model invents are checked against real results and removed.'],
  ['You confirm actions', 'Anything that changes data waits for your Confirm before it runs.'],
];

function Diagram() {
  const box = (x, y, w, label, sub, accent) => (
    <g>
      <rect x={x} y={y} width={w} height="62" rx="12" className={accent ? 'dg-box dg-accent' : 'dg-box'} />
      <text x={x + w / 2} y={y + 27} textAnchor="middle" className="dg-t">{label}</text>
      <text x={x + w / 2} y={y + 46} textAnchor="middle" className="dg-s">{sub}</text>
    </g>
  );
  const arrow = (x1, y1, x2, y2) => <line x1={x1} y1={y1} x2={x2} y2={y2} className="dg-line" markerEnd="url(#ah)" />;
  return (
    <svg className="diagram" viewBox="0 0 760 330" role="img"
      aria-label="Architecture: the React app on Vercel calls an Express API on Render, which uses MongoDB, Groq, news sources and Firebase.">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="dg-head" />
        </marker>
      </defs>
      {box(20, 134, 170, 'React app', 'Vercel', true)}
      {box(295, 134, 170, 'Express API', 'Render · Zod · JWT', true)}
      {box(570, 20, 170, 'MongoDB', 'articles, users, library')}
      {box(570, 100, 170, 'Groq', 'summaries and the agent')}
      {box(570, 180, 170, 'News sources', 'NewsAPI, Google RSS')}
      {box(570, 260, 170, 'Firebase Auth', 'Google sign-in')}
      {arrow(190, 165, 295, 165)}
      {arrow(465, 150, 570, 52)}
      {arrow(465, 160, 570, 131)}
      {arrow(465, 172, 570, 211)}
      {arrow(465, 182, 570, 291)}
      <text x="242" y="152" textAnchor="middle" className="dg-s">REST + SSE</text>
    </svg>
  );
}

export default function About() {
  const ref = useReveal();
  return (
    <div className="page about" ref={ref}>
      <header className="about-head">
        <p className="dateline">Under the hood</p>
        <h1 className="page-title about-title">How NexusAI is built</h1>
        <p className="page-sub about-lead">
          A full-stack news app where the interesting work is the AI agent, the checks around it, and the tests that keep it honest.
        </p>
        <div className="ph-actions" style={{ marginTop: 16 }}>
          <a className="btn btn-ghost btn-sm" href={REPO} target="_blank" rel="noopener noreferrer"><Code2 size={14} /> Source on GitHub</a>
          <Link className="btn btn-primary btn-sm" to="/signup">Try it <ArrowRight size={14} /></Link>
        </div>
      </header>

      <section className="about-sec" data-reveal>
        <h2>Architecture</h2>
        <Diagram />
      </section>

      <section className="about-sec" data-reveal>
        <h2><Wrench size={18} aria-hidden="true" /> How the agent answers</h2>
        <ol className="loop">
          {LOOP.map(([t, d], i) => (
            <li key={t}><span className="loop-n">{i + 1}</span><div><b>{t}</b><p>{d}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="about-sec" data-reveal>
        <h2><FlaskConical size={18} aria-hidden="true" /> Measured, not claimed</h2>
        <p className="about-p">
          The agent is graded on a fixed set of questions with <code>npm run eval</code>. These are the numbers from a real run
          ({EVAL.graded} questions graded):
        </p>
        <div className="eval-grid">
          <div className="eval-tile"><b>{EVAL.rightTool}%</b><span>chose the right tools</span></div>
          <div className="eval-tile"><b>{EVAL.finished}%</b><span>finished with an answer</span></div>
          <div className="eval-tile"><b>{EVAL.cited}%</b><span>cited a source</span></div>
        </div>
        <p className="meta" style={{ marginTop: 10 }}>The grading code is unit-tested separately, so the scorer itself is trustworthy.</p>
      </section>

      <section className="about-sec" data-reveal>
        <h2><Shield size={18} aria-hidden="true" /> Stack</h2>
        <dl className="stack">
          {STACK.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
        <p className="meta" style={{ marginTop: 12 }}>
          The API runs on a free hosting tier, so the first request after a quiet spell can take up to a minute while it wakes up.
        </p>
      </section>
    </div>
  );
}
