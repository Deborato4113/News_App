import { Check, X, Brain, Wrench } from 'lucide-react';
import { toolProgressLabel, seconds } from './agentUi';

// What the agent is doing RIGHT NOW, fed by the live event stream, drawn as a
// timeline so you can watch it think, call a tool, then think again.
export default function ProgressList({ progress }) {
  return (
    <ol className="tl" style={{ marginTop: 14 }} aria-live="polite">
      {progress.length === 0 && (
        <li className="tl-item">
          <span className="tl-dot run"><div className="spinner" style={{ width: 11, height: 11 }} /></span>
          <div className="tl-main">Starting…</div>
        </li>
      )}
      {progress.map((p, i) => {
        const failed = p.kind === 'tool' && p.done && p.step && !p.step.ok;
        const label = p.kind === 'model'
          ? (p.done ? `Thought it through (${seconds(p.ms)})` : 'Thinking…')
          : (p.done ? p.step?.summary || 'Done' : `${toolProgressLabel(p.tool)}…`);
        const Icon = p.kind === 'model' ? Brain : Wrench;
        return (
          <li key={i} className="tl-item" style={{ '--i': 0, opacity: p.done ? 0.85 : 1 }}>
            <span className={`tl-dot ${!p.done ? 'run' : failed ? 'bad' : 'ok'}`}>
              {!p.done ? <div className="spinner" style={{ width: 11, height: 11 }} />
                : failed ? <X size={12} /> : p.kind === 'tool' ? <Check size={12} /> : <Icon size={12} />}
            </span>
            <div className="tl-main">
              {p.kind === 'tool' && p.done && <strong>{toolProgressLabel(p.tool)} · </strong>}
              {label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
