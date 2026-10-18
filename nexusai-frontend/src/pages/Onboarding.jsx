import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { CITIES, TOPICS } from '../lib/places';

// Two quick choices after sign-up so the first dashboard is already theirs.
export default function Onboarding() {
  const { user, updateProfile, followRegion } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [cities, setCities] = useState([]);
  const [topics, setTopics] = useState([]);
  const [busy, setBusy] = useState(false);

  const pick = (list, set, max) => (v) => set(list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list);

  async function finish(skip) {
    setBusy(true);
    try {
      if (skip) {
        await updateProfile({ onboarded: true });
      } else {
        await updateProfile({ defaultRegion: cities[0] || '', interests: topics, onboarded: true });
        // The first city is the default; every pick is also followed for My feed.
        for (const c of cities) await followRegion(c);
      }
      navigate('/', { replace: true });
    } catch {
      toast.error('Could not save your picks. You can set them later in Settings.');
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="page narrow onboard">
      <div className="onboard-steps" aria-hidden="true">
        {[0, 1].map((i) => <span key={i} className={`ob-dot${step >= i ? ' on' : ''}`} />)}
      </div>

      {step === 0 ? (
        <section key="cities" className="ob-step">
          <p className="dateline">Welcome, {user.name.split(' ')[0]}</p>
          <h1 className="page-title"><MapPin size={22} style={{ verticalAlign: '-3px', color: 'var(--green)' }} aria-hidden="true" /> Which cities do you follow?</h1>
          <p className="page-sub">Pick up to 3. The first is where your news opens; all of them appear in My feed.</p>
          <div className="chip-row ob-chips" role="group" aria-label="Cities">
            {CITIES.map((c) => (
              <button key={c} type="button" className={`chip${cities.includes(c) ? ' active' : ''}`} aria-pressed={cities.includes(c)} onClick={() => pick(cities, setCities, 3)(c)}>
                {cities.includes(c) && <Check size={12} aria-hidden="true" />}{c}
                {cities[0] === c && <span className="count">default</span>}
              </button>
            ))}
          </div>
          <div className="ob-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => finish(true)} disabled={busy}>Skip for now</button>
            <button className="btn btn-primary" type="button" onClick={() => setStep(1)}>Next <ArrowRight size={15} /></button>
          </div>
        </section>
      ) : (
        <section key="topics" className="ob-step">
          <p className="dateline">One more thing</p>
          <h1 className="page-title"><Sparkles size={22} style={{ verticalAlign: '-3px', color: 'var(--green)' }} aria-hidden="true" /> What do you like reading about?</h1>
          <p className="page-sub">Your topics are listed first when you filter the news. Change them any time in Settings.</p>
          <div className="chip-row ob-chips" role="group" aria-label="Topics">
            {TOPICS.map((t) => (
              <button key={t} type="button" className={`chip${topics.includes(t) ? ' active' : ''}`} aria-pressed={topics.includes(t)} onClick={() => pick(topics, setTopics, 8)(t)}>
                {topics.includes(t) && <Check size={12} aria-hidden="true" />}{t}
              </button>
            ))}
          </div>
          <div className="ob-actions">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStep(0)} disabled={busy}>Back</button>
            <button className="btn btn-primary" type="button" onClick={() => finish(false)} disabled={busy}>
              {busy ? 'Setting up…' : 'Take me to my news'} <ArrowRight size={15} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
