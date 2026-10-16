import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';
import CommandPalette from './components/CommandPalette';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Quiz from './pages/Quiz';
import AdminDashboard from './pages/AdminDashboard';
import SavedArticles from './pages/SavedArticles';
import SearchPage from './pages/SearchPage';
import MyFeed from './pages/MyFeed';
import AskNexus from './pages/AskNexus';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner-lg" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/" replace />;
}

// "/" shows the dashboard to signed-in users and the public landing page to everyone else.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner-lg" /></div>;
  return user ? <Dashboard /> : <Landing />;
}

const TITLES = {
  '/': 'News', '/ask': 'Ask AI', '/quiz': 'Quiz', '/feed': 'My feed', '/saved': 'Saved articles',
  '/search': 'Search', '/admin': 'Admin', '/login': 'Log in', '/signup': 'Sign up',
};

// On every page change: back to the top and a page-specific tab title.
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLES[pathname] ? `${TITLES[pathname]} · NexusAI` : 'NexusAI — Regional Current Affairs';
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <>
      <RouteEffects />
      <ScrollProgress />
      <CommandPalette />
      <Navbar />
      <div key={pathname} className="route">
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/quiz"            element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/saved"           element={<ProtectedRoute><SavedArticles /></ProtectedRoute>} />
        <Route path="/search"          element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/feed"            element={<ProtectedRoute><MyFeed /></ProtectedRoute>} />
        <Route path="/ask"             element={<ProtectedRoute><AskNexus /></ProtectedRoute>} />
        <Route path="/admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000, className: 'toast-card' }} />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
