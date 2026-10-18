import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';
import CommandPalette from './components/CommandPalette';
import Shortcuts from './components/Shortcuts';
import ServerStatus from './components/ServerStatus';
import ReaderProvider from './components/ReaderProvider';
import LibraryProvider from './components/LibraryProvider';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Quiz = lazy(() => import('./pages/Quiz'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SavedArticles = lazy(() => import('./pages/SavedArticles'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const MyFeed = lazy(() => import('./pages/MyFeed'));
const AskNexus = lazy(() => import('./pages/AskNexus'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const History = lazy(() => import('./pages/History'));
const About = lazy(() => import('./pages/About'));

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

const DEFAULT_DESC = 'NexusAI delivers AI-summarized regional current affairs, quizzes, and a news Q&A assistant tailored to your city.';
const PAGES = {
  '/': ['News', 'Regional news from any city, summarised and checked by AI.'],
  '/ask': ['Ask AI', 'Ask a question and get an answer with numbered sources from real articles.'],
  '/quiz': ['Quiz', 'Practice current affairs with quizzes generated from today’s news.'],
  '/feed': ['My feed', 'News from the cities you follow, in one place.'],
  '/saved': ['Saved articles', 'Your reading list and collections.'],
  '/history': ['Reading history', 'Stories you have opened recently.'],
  '/search': ['Search', 'Search every article that has been fetched, in any region.'],
  '/settings': ['Settings', 'Your profile, reading preferences and account.'],
  '/welcome': ['Welcome', 'Choose your cities and topics.'],
  '/about': ['How it’s built', 'The architecture, the AI agent loop and the measured results behind NexusAI.'],
  '/admin': ['Admin', 'Moderation and usage.'],
  '/forgot-password': ['Reset password', DEFAULT_DESC],
  '/login': ['Log in', DEFAULT_DESC],
  '/signup': ['Sign up', DEFAULT_DESC],
};

// On every page change: back to the top, plus a page-specific tab title and description.
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const [title, desc] = PAGES[pathname] || [];
    document.title = title ? `${title} · NexusAI` : 'NexusAI — Regional Current Affairs';
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc || DEFAULT_DESC);
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
      <Shortcuts />
      <ServerStatus />
      <Navbar />
      <div key={pathname} className="route">
      <Suspense fallback={<div className="loading-screen" style={{ height: '50vh' }}><div className="spinner-lg" /></div>}>
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/quiz"            element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/saved"           element={<ProtectedRoute><SavedArticles /></ProtectedRoute>} />
        <Route path="/search"          element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/feed"            element={<ProtectedRoute><MyFeed /></ProtectedRoute>} />
        <Route path="/ask"             element={<ProtectedRoute><AskNexus /></ProtectedRoute>} />
        <Route path="/settings"        element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/history"         element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/welcome"         element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/about"           element={<About />} />
        <Route path="/admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="*"                element={<NotFound />} />
      </Routes>
      </Suspense>
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
          <LibraryProvider>
            <ReaderProvider>
              <AppRoutes />
            </ReaderProvider>
          </LibraryProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
