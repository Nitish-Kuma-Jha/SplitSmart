import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Groups from './pages/groups/Groups';
import GroupDetail from './pages/groups/GroupDetail';
import Expenses from './pages/expenses/Expenses';
import Settlements from './pages/expenses/Settlements';
import Balances from './pages/expenses/Balances';
import ImportPage from './pages/import/ImportPage';
import ImportReview from './pages/import/ImportReview';
import Reports from './pages/reports/Reports';
import AiAssistant from './pages/ai/AiAssistant';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <span className="loading-spinner" style={{ width:32, height:32 }} />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/verify" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
      <Route path="/groups" element={<PrivateRoute><AppLayout><Groups /></AppLayout></PrivateRoute>} />
      <Route path="/groups/:id" element={<PrivateRoute><AppLayout><GroupDetail /></AppLayout></PrivateRoute>} />
      <Route path="/expenses" element={<PrivateRoute><AppLayout><Expenses /></AppLayout></PrivateRoute>} />
      <Route path="/settlements" element={<PrivateRoute><AppLayout><Settlements /></AppLayout></PrivateRoute>} />
      <Route path="/balances" element={<PrivateRoute><AppLayout><Balances /></AppLayout></PrivateRoute>} />
      <Route path="/import" element={<PrivateRoute><AppLayout><ImportPage /></AppLayout></PrivateRoute>} />
      <Route path="/import/:jobId/review" element={<PrivateRoute><AppLayout><ImportReview /></AppLayout></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><AppLayout><Reports /></AppLayout></PrivateRoute>} />
      <Route path="/ai" element={<PrivateRoute><AppLayout><AiAssistant /></AppLayout></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { background:'#16161f', color:'#e8e8f0', border:'1px solid #2a2a3a', fontFamily:"'Space Grotesk',sans-serif", fontSize:'14px' }, success:{ iconTheme:{ primary:'#22c55e', secondary:'#16161f' } }, error:{ iconTheme:{ primary:'#ef4444', secondary:'#16161f' } } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
