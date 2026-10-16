import { Bot, ShieldCheck, Bookmark } from 'lucide-react';

// Shared frame for Login / Signup: a short pitch on the left (hidden on
// phones), the form card on the right.
export default function AuthShell({ children }) {
  return (
    <div className="auth-wrap auth-split">
      <aside className="auth-aside" aria-hidden="true">
        <h2>Ask the news anything.</h2>
        <div className="auth-points">
          <div className="auth-point"><Bot size={18} /><span><b>Ask in plain English.</b> The assistant searches the news and shows every step it takes.</span></div>
          <div className="auth-point"><ShieldCheck size={18} /><span><b>Sources you can check.</b> Every link comes from a real article, never from the model's memory.</span></div>
          <div className="auth-point"><Bookmark size={18} /><span><b>You stay in control.</b> Nothing is saved to your account until you press Confirm.</span></div>
        </div>
      </aside>
      <div className="auth-main">{children}</div>
    </div>
  );
}
