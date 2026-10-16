import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Search as SearchIcon, Newspaper, BrainCircuit, ShieldCheck, Star, Bookmark, Search, Bot, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';

// One link style everywhere; NavLink adds the "active" class for the current page.
function Item({ to, icon: Icon, children, onClick, end }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <Icon size={15} aria-hidden="true" /> {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  function handleLogout() {
    close();
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={close} aria-label="NexusAI home">
          <span className="brand-dot" />
          <span className="brand-name">Nexus<span>AI</span></span>
        </Link>

        <button
          className="nav-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className={`nav-links${open ? ' open' : ''}`}>
          {user ? (
            <>
              <Item to="/" end icon={Newspaper} onClick={close}>News</Item>
              <Item to="/ask" icon={Bot} onClick={close}>Ask AI</Item>
              <Item to="/quiz" icon={BrainCircuit} onClick={close}>Quiz</Item>
              <Item to="/feed" icon={Star} onClick={close}>My feed</Item>
              <Item to="/saved" icon={Bookmark} onClick={close}>Saved</Item>
              <Item to="/search" icon={Search} onClick={close}>Search</Item>
              {user.role === 'admin' && <Item to="/admin" icon={ShieldCheck} onClick={close}>Admin</Item>}
              <button type="button" className="nav-search" onClick={() => { close(); window.dispatchEvent(new Event('nexus:palette')); }} aria-label="Quick find">
                <SearchIcon size={14} aria-hidden="true" /> <span className="lbl">Quick find</span> <kbd className="kbd">Ctrl K</kbd>
              </button>
              <div className="nav-sep" />
              <span className="nav-user">
                <span className="avatar" aria-hidden="true">{(user.name || '?').trim().charAt(0).toUpperCase()}</span>
                {(user.name || '').split(' ')[0]}
              </span>
              <button className="nav-link" onClick={handleLogout} title="Log out"><LogOut size={15} aria-hidden="true" /> <span className="lbl">Log out</span></button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={close}>Log in</Link>
              <Link to="/signup" className="btn btn-primary btn-sm" onClick={close}>Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
