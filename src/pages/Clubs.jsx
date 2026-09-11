import { useEffect, useState } from 'react';
import { fetchClubStandings } from '../services/clubs.js';
import PullToRefresh from '../components/PullToRefresh.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { getPageCache, setPageCache } from '../utils/pageCache.js';

const CACHE_KEY = 'clubs';

export default function Clubs() {
  const cached = getPageCache(CACHE_KEY);
  const [clubs, setClubs] = useState(cached?.clubs ?? []);
  const [loading, setLoading] = useState(!cached);

  async function load() {
    const list = await fetchClubStandings();
    setClubs(list);
    setPageCache(CACHE_KEY, { clubs: list });
  }

  useEffect(() => {
    load().then(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen">Chargement...</div>;

  return (
    <div className="app-shell">
      <PullToRefresh onRefresh={load}>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 14 }}>{club.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: 'var(--navy-soft)' }}>
                  {club.played} MJ · {club.goalDiff > 0 ? '+' : ''}{club.goalDiff}
                </span>
                {club.form.length > 0 && (
                  <span style={{ display: 'flex', gap: 2 }}>
                    {club.form.map((result, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: 14, height: 14, borderRadius: '50%', fontSize: 8, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff',
                          background: result === 'V' ? 'var(--win)' : result === 'N' ? 'var(--navy-soft)' : 'var(--lock)',
                        }}
                      >
                        {result}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500 }}>{club.points} pts</div>
          </div>
        );
      })}

      {clubs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
          Le classement des clubs n'est pas encore disponible.
        </div>
      )}
      </PullToRefresh>

      <BottomNav />
    </div>
  );
}
