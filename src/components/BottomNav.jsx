import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ICONS = {
  home: <path d="M3 11l9-7 9 7 M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />,
  matches: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></>,
  clubs: <path d="M4 20V10M12 20V4M20 20v-7" />,
  players: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  bonus: <path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7.1L12 17.7l-6.2 3.5 1.6-7.1L2 9.3l7.1-.7z" />,
  admin: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
};

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {ICONS[name]}
    </svg>
  );
}

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const items = [
    { to: '/', label: 'Accueil', icon: 'home', end: true },
    { to: '/matchs', label: 'Matchs', icon: 'matches' },
    { to: '/clubs', label: 'Clubs', icon: 'clubs' },
    { to: '/joueurs', label: 'Joueurs', icon: 'players' },
    { to: '/bonus', label: 'Bonus', icon: 'bonus' },
  ];
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', icon: 'admin' });

  return (
    <nav className="nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <NavIcon name={item.icon} />
          <div className="nav-label">{item.label}</div>
        </NavLink>
      ))}
    </nav>
  );
}
