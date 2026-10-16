import { Link } from 'react-router-dom';
import { Sparkles, MapPin, Bot, BrainCircuit, Bookmark, ShieldCheck, ArrowRight, MessagesSquare } from 'lucide-react';
import HeroDemo from '../components/HeroDemo';

const FEATURES = [
  { icon: MapPin, title: 'News for your city', text: 'Follow the regions you care about and get local headlines, summarised and labelled by topic, sentiment and bias.' },
  { icon: Bot, title: 'Ask NexusAI', text: 'A tool-calling AI agent that searches the news, compares regions, builds a daily briefing and cites the articles it used.' },
  { icon: BrainCircuit, title: 'Quizzes that adapt', text: 'Generate quizzes on current affairs and track your weak topics, then ask the assistant what to revise next.' },
  { icon: Bookmark, title: 'Save with a confirm', text: 'The assistant can propose saving an article, but nothing is stored until you press Confirm.' },
  { icon: ShieldCheck, title: 'Grounded answers', text: 'Every source link comes from a real search result. Invented links are removed before you see them.' },
  { icon: MessagesSquare, title: 'Follow-ups that remember', text: 'Ask a follow-up and the assistant keeps the context of the conversation, with suggested next questions.' },
];

const STEPS = [
  { title: 'You ask in plain language', text: '"What is happening in Mumbai today, and what should I revise for my quiz?"' },
  { title: 'The agent picks its tools', text: 'It searches the news, reads your quiz history, or compares regions, and shows each step live.' },
  { title: 'You get a cited answer', text: 'A short answer with numbered sources, follow-up suggestions, and a thumbs up or down to rate it.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="hero">
        <span className="hero-pill"><Sparkles size={14} aria-hidden="true" /> AI news assistant with live, cited answers</span>
        <h1>Regional news you can <em>ask questions</em> about.</h1>
        <p>
          NexusAI collects news for your city, summarises it, and lets you talk to an AI agent that
          finds the facts, shows its work and cites its sources.
        </p>
        <div className="hero-cta">
          <Link to="/signup" className="btn btn-primary btn-lg">Get started free <ArrowRight size={16} aria-hidden="true" /></Link>
          <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
        </div>

        <HeroDemo />
      </header>

      <section className="section" aria-labelledby="features-title">
        <p className="section-eyebrow">What it does</p>
        <h2 className="section-title" id="features-title">Everything in one place, nothing made up.</h2>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div className="feature" key={title}>
              <span className="feature-icon"><Icon size={19} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <p className="section-eyebrow">How Ask NexusAI works</p>
        <h2 className="section-title" id="how-title">Ask, watch it work, check the sources.</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2 className="section-title" style={{ margin: '0 auto' }}>Ready to try it?</h2>
        <p className="page-sub" style={{ margin: '10px auto 1.5rem' }}>Create a free account and ask your first question in under a minute.</p>
        <Link to="/signup" className="btn btn-primary btn-lg">Create your account <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
