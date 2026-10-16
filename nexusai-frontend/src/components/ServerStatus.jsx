import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';

// Bottom notice for two situations the user cannot fix but should understand:
// they are offline, or the (free-tier) server is waking up from sleep.
export default function ServerStatus() {
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const onSlow = (e) => setSlow(Boolean(e.detail));
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('nexusai:slow', onSlow);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('nexusai:slow', onSlow);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!offline && !slow) return null;

  return (
    <div className={`status-pill ${offline ? 'bad' : ''}`} role="status" aria-live="polite">
      {offline ? <WifiOff size={15} /> : <Loader2 size={15} className="spin" />}
      <span>
        {offline
          ? "You're offline. Reconnect and try again."
          : 'Waking the server up. It sleeps when idle, so the first load can take up to a minute.'}
      </span>
    </div>
  );
}
