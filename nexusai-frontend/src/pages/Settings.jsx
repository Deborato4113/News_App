import { useState } from 'react';
import { Settings as SettingsIcon, User, MapPin, KeyRound, Smartphone, Trash2, Download, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useInstall from '../hooks/useInstall';
import PageHeader from '../components/PageHeader';
import { CITIES, TOPICS } from '../lib/places';
import { titleCase } from '../lib/text';

const pwRule = (pw) => {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/.test(pw)) return 'Add a lowercase letter.';
  if (!/[A-Z]/.test(pw)) return 'Add an uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Add a number.';
  return '';
};

const errText = (err, fallback) => err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fallback;

function Section({ icon: Icon, title, children, danger }) {
  return (
    <section className={`card settings-card${danger ? ' danger-zone' : ''}`}>
      <h2 className="card-title"><Icon size={16} aria-hidden="true" /> {title}</h2>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user, updateProfile, changePassword, deleteAccount } = useAuth();
  const { canInstall, installed, install } = useInstall();

  const [name, setName] = useState(user.name);
  const [city, setCity] = useState(titleCase(user.defaultRegion || ''));
  const [interests, setInterests] = useState(user.interests || []);
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [del, setDel] = useState({ email: '', password: '' });
  const [deleting, setDeleting] = useState(false);

  const isLocal = user.authProvider === 'local';
  const profileDirty = name.trim() !== user.name || city.trim().toLowerCase() !== (user.defaultRegion || '') ||
    interests.slice().sort().join() !== (user.interests || []).slice().sort().join();

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), defaultRegion: city.trim(), interests });
      toast.success('Settings saved');
    } catch (err) { toast.error(errText(err, 'Could not save your settings.')); }
    setSaving(false);
  }

  async function savePassword(e) {
    e.preventDefault();
    const problem = pwRule(pw.next);
    if (problem) { toast.error(problem); return; }
    setPwSaving(true);
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      toast.success('Password updated');
    } catch (err) { toast.error(errText(err, 'Could not change the password.')); }
    setPwSaving(false);
  }

  async function removeAccount(e) {
    e.preventDefault();
    setDeleting(true);
    try {
      await deleteAccount(del.email.trim(), isLocal ? del.password : undefined);
      toast.success('Your account has been deleted.');
    } catch (err) {
      toast.error(errText(err, 'Could not delete the account.'));
      setDeleting(false);
    }
  }

  const toggleTopic = (t) => setInterests((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < 8 ? [...cur, t] : cur));

  return (
    <div className="page narrow">
      <PageHeader icon={SettingsIcon} title="Settings" sub={user.email} />

      <form onSubmit={saveProfile}>
        <Section icon={User} title="Profile">
          <label className="label" htmlFor="set-name">Name</label>
          <input id="set-name" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required />
        </Section>

        <Section icon={MapPin} title="Reading preferences">
          <label className="label" htmlFor="set-city">Default city</label>
          <input id="set-city" className="input" list="set-cities" placeholder="The city the dashboard opens on" value={city}
            onChange={(e) => setCity(e.target.value)} maxLength={60} />
          <datalist id="set-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>

          <p className="label" style={{ marginTop: 16 }}>Topics you care about</p>
          <div className="chip-row" role="group" aria-label="Topics" style={{ marginBottom: 0 }}>
            {TOPICS.map((t) => (
              <button key={t} type="button" className={`chip${interests.includes(t) ? ' active' : ''}`} aria-pressed={interests.includes(t)} onClick={() => toggleTopic(t)}>
                {interests.includes(t) && <Check size={12} aria-hidden="true" />}{t}
              </button>
            ))}
          </div>
          <p className="meta" style={{ marginTop: 8 }}>Your topics are listed first when you filter the news.</p>

          <div className="settings-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={!profileDirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </Section>
      </form>

      {isLocal && (
        <form onSubmit={savePassword}>
          <Section icon={KeyRound} title="Password">
            <label className="label" htmlFor="set-cur">Current password</label>
            <input id="set-cur" className="input" type="password" autoComplete="current-password" value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required />
            <label className="label" htmlFor="set-new" style={{ marginTop: 12 }}>New password</label>
            <input id="set-new" className="input" type="password" autoComplete="new-password" placeholder="8+ chars, upper, lower, number" value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required />
            <div className="settings-actions">
              <button className="btn btn-ghost btn-sm" type="submit" disabled={pwSaving || !pw.current || !pw.next}>{pwSaving ? 'Updating…' : 'Update password'}</button>
            </div>
          </Section>
        </form>
      )}

      <Section icon={Smartphone} title="Install the app">
        {installed ? (
          <p className="meta">NexusAI is installed on this device.</p>
        ) : canInstall ? (
          <>
            <p className="meta" style={{ marginBottom: 12 }}>Add NexusAI to your home screen or desktop. It opens in its own window and starts faster.</p>
            <button className="btn btn-primary btn-sm" type="button" onClick={install}><Download size={14} /> Install NexusAI</button>
          </>
        ) : (
          <p className="meta">Your browser offers installation when the app is ready (Chrome, Edge and Android). On iPhone, tap Share, then Add to Home Screen.</p>
        )}
      </Section>

      <Section icon={Trash2} title="Delete account" danger>
        <p className="meta" style={{ marginBottom: 12 }}>
          Permanently removes your account, saved articles, likes, comments, notes, collections, reading history and quiz results. This cannot be undone.
        </p>
        {!delOpen ? (
          <button className="btn btn-danger btn-sm" type="button" onClick={() => setDelOpen(true)}>Delete my account…</button>
        ) : (
          <form onSubmit={removeAccount}>
            <label className="label" htmlFor="del-email">Type your email ({user.email}) to confirm</label>
            <input id="del-email" className="input" type="email" value={del.email} onChange={(e) => setDel((d) => ({ ...d, email: e.target.value }))} required />
            {isLocal && (
              <>
                <label className="label" htmlFor="del-pw" style={{ marginTop: 12 }}>Password</label>
                <input id="del-pw" className="input" type="password" autoComplete="current-password" value={del.password} onChange={(e) => setDel((d) => ({ ...d, password: e.target.value }))} required />
              </>
            )}
            <div className="settings-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setDelOpen(false); setDel({ email: '', password: '' }); }}>Cancel</button>
              <button className="btn btn-danger btn-sm" type="submit"
                disabled={deleting || del.email.trim().toLowerCase() !== user.email.toLowerCase() || (isLocal && !del.password)}>
                {deleting ? 'Deleting…' : 'Delete everything'}
              </button>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
}
