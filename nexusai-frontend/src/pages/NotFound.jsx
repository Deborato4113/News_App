import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="nf-code display" aria-hidden="true">404</div>
      <EmptyState icon={Compass} title="This page doesn't exist"
        action={
          <div className="ph-actions" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary btn-sm"><Home size={14} /> Back to news</Link>
            <Link to="/search" className="btn btn-ghost btn-sm"><Search size={14} /> Search</Link>
          </div>
        }>
        The link may be old or mistyped. Try the news page or search for what you were after.
      </EmptyState>
    </div>
  );
}
