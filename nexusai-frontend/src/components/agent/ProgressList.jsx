import { CheckCircle2, XCircle } from 'lucide-react';
import { toolProgressLabel, seconds } from './agentUi';

// What the agent is doing RIGHT NOW, fed by the live event stream.
export default function ProgressList({ progress }) {
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 10 }} aria-live="polite">
      {progress.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
          <div className="spinner" /> Starting…
        </div>
      )}
      {progress.map((p, i) => {
        const failed = p.kind === 'tool' && p.done && p.step && !p.step.ok;
        const label = p.kind === 'model'
          ? (p.done ? `Thought it through (${seconds(p.ms)})` : 'Thinking…')
          : (p.done ? p.step?.summary || 'Done' : `${toolProgressLabel(p.tool)}…`);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: p.done ? 'var(--text2)' : 'var(--text)' }}>
            {!p.done ? <div className="spinner" />
              : failed ? <XCircle size={14} color="var(--red)" />
              : <CheckCircle2 size={14} color="var(--green)" />}
            <span>
              {p.kind === 'tool' && p.done && <strong style={{ fontWeight: 600 }}>{toolProgressLabel(p.tool)} · </strong>}
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
