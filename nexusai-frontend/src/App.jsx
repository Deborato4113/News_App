import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
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

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"                element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/quiz"            element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/saved"           element={<ProtectedRoute><SavedArticles /></ProtectedRoute>} />
        <Route path="/search"          element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/feed"            element={<ProtectedRoute><MyFeed /></ProtectedRoute>} />
        <Route path="/admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/login"           element={<Login />} />
        <Route path="/signup"          element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
