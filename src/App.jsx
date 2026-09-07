import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Chargement "à la demande" : chaque écran n'est téléchargé que lorsqu'on y
// accède, au lieu de tout charger d'un coup au démarrage — l'appli s'ouvre
// plus vite, surtout avec une connexion mobile moyenne.
const pageLoaders = {
  login: () => import('./pages/Login.jsx'),
  home: () => import('./pages/Home.jsx'),
  matches: () => import('./pages/Matches.jsx'),
  matchPredict: () => import('./pages/MatchPredict.jsx'),
  clubs: () => import('./pages/Clubs.jsx'),
  players: () => import('./pages/Players.jsx'),
  bonus: () => import('./pages/Bonus.jsx'),
  admin: () => import('./pages/Admin.jsx'),
};

const Login = lazy(pageLoaders.login);
const Home = lazy(pageLoaders.home);
const Matches = lazy(pageLoaders.matches);
const MatchPredict = lazy(pageLoaders.matchPredict);
const Clubs = lazy(pageLoaders.clubs);
const Players = lazy(pageLoaders.players);
const Bonus = lazy(pageLoaders.bonus);
const Admin = lazy(pageLoaders.admin);

/**
 * Une fois le premier écran affiché, précharge tranquillement les autres
 * écrans un par un en arrière-plan (sans bloquer ni ralentir l'affichage
 * actuel). Comme ça, quand le joueur clique sur "Matchs" ou "Clubs" un peu
 * plus tard, l'écran est déjà en mémoire et s'affiche instantanément.
 */
function usePrefetchOtherScreens(currentPath) {
  useEffect(() => {
    const order = ['home', 'matches', 'clubs', 'players', 'bonus', 'matchPredict', 'admin', 'login'];
    let cancelled = false;

    function prefetchNext(index) {
      if (cancelled || index >= order.length) return;
      const load = pageLoaders[order[index]];
      const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
      schedule(() => {
        load().finally(() => prefetchNext(index + 1));
      });
    }

    prefetchNext(0);
    return () => { cancelled = true; };
    // volontairement lancé une seule fois au démarrage de l'appli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

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
  usePrefetchOtherScreens();

  return (
    <Suspense fallback={<div className="loading-screen">Chargement...</div>}>
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
    </Suspense>
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
