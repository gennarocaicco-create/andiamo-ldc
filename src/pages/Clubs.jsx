import { useEffect, useState } from 'react';
import { fetchClubStandings } from '../services/clubs.js';
import BottomNav from '../components/BottomNav.jsx';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubStandings().then((list) => {
      setClubs(list);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-screen">Chargement...</div>;

  return (
    <div className="app-shell">
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Phase de Ligue</div>
        <h1>Clubs</h1>
      </header>

      <div className="section-label">Table complète</div>

      {clubs.map((club, i) => {
        const zone = i < 8 ? 'gold' : i < 24 ? 'blue' : null;
        return (
          <div key={club.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px' }}>
            <div style={{ width: 20, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: zone === 'gold' ? 'var(--gold)' : zone === 'blue' ? 'var(--blue)' : 'var(--navy-soft)', fontWeight: zone ? 600 : 400 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 14 }}>{club.name}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500 }}>{club.points} pts</div>
          </div>
        );
      })}

      {clubs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
          Le classement des clubs n'est pas encore disponible.
        </div>
      )}

      <BottomNav />
    </div>
  );
}
