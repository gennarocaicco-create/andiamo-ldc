import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Matches from './pages/Matches.jsx';
import MatchPredict from './pages/MatchPredict.jsx';
import Clubs from './pages/Clubs.jsx';
import Players from './pages/Players.jsx';
import Bonus from './pages/Bonus.jsx';
import Admin from './pages/Admin.jsx';

function RequireAuth({ children }) {
  const { firebaseUser, loading } = useAuth();
  if (loading) return <div className="loading-screen">Chargement...</div>;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="loading-screen">Chargement...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/matchs" element={<RequireAuth><Matches /></RequireAuth>} />
      <Route path="/matchs/:matchId" element={<RequireAuth><MatchPredict /></RequireAuth>} />
      <Route path="/clubs" element={<RequireAuth><Clubs /></RequireAuth>} />
      <Route path="/joueurs" element={<RequireAuth><Players /></RequireAuth>} />
      <Route path="/bonus" element={<RequireAuth><Bonus /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><RequireAdmin><Admin /></RequireAdmin></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
