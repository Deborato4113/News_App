import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Newspaper, BrainCircuit, ShieldCheck, Star, Bookmark, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const iconLinkStyle = (path) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 'var(--radius)',
    border: '1px solid var(--border)', color: pathname === path ? 'var(--green)' : 'var(--text2)',
    borderColor: pathname === path ? 'var(--green)' : 'var(--border)',
    background: pathname === path ? 'var(--bg3)' : 'transparent',
  });

  return (
    <nav style={{
      background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto', padding: '0.5rem 1.5rem',
        minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
            boxShadow: '0 0 6px var(--green)', display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
          <span className="display" style={{ fontSize: 18, color: 'var(--green)' }}>NexusAI</span>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </Link>

        {/* Nav links + user */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Link to="/" className={`btn btn-ghost btn-sm${pathname==='/'?' active':''}`}
              style={pathname==='/'?{color:'var(--green)',borderColor:'var(--green)'}:{}}>
              <Newspaper size={14} /> News
            </Link>
            <Link to="/quiz" className={`btn btn-ghost btn-sm${pathname==='/quiz'?' active':''}`}
              style={pathname==='/quiz'?{color:'var(--green)',borderColor:'var(--green)'}:{}}>
              <BrainCircuit size={14} /> Quiz
            </Link>
            <Link to="/feed" title="My Feed" style={iconLinkStyle('/feed')}>
              <Star size={14} />
            </Link>
            <Link to="/saved" title="Saved Articles" style={iconLinkStyle('/saved')}>
              <Bookmark size={14} />
            </Link>
            <Link to="/search" title="Search" style={iconLinkStyle('/search')}>
              <Search size={14} />
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className={`btn btn-ghost btn-sm${pathname==='/admin'?' active':''}`}
                style={pathname==='/admin'?{color:'var(--green)',borderColor:'var(--green)'}:{}}>
                <ShieldCheck size={14} /> Admin
              </Link>
            )}
            <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              {user.name.split(' ')[0]}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
