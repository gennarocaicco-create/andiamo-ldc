import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchAllMatches } from '../services/matches.js';
import { fetchPlayerLeaderboard } from '../services/players.js';
import BottomNav from '../components/BottomNav.jsx';

export default function Home() {
  const { profile } = useAuth();
  const [nextMatch, setNextMatch] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [matches, players] = await Promise.all([fetchAllMatches(), fetchPlayerLeaderboard()]);
      if (cancelled) return;

      const upcoming = matches.find((m) => m.status === 'scheduled');
      setNextMatch(upcoming || null);
      setLeaderboard(players.slice(0, 5));
      const myIndex = players.findIndex((p) => p.id === profile?.id);
      setMyRank(myIndex >= 0 ? { rank: myIndex + 1, total: players.length, ...players[myIndex] } : null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [profile]);

  if (loading) return <div className="loading-screen">Chargement...</div>;

  return (
    <div className="app-shell">
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Bonjour, {profile?.pseudo}</h1>
      </header>

      <div className="hero">
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-soft)' }}>
          Ta position
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 34, marginTop: 4 }}>
          {myRank ? myRank.rank : '—'}
          <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>
            / {myRank ? myRank.total : 0} joueurs
          </span>
        </div>
        {myRank && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
            {myRank.points} pts · {myRank.exactCount} scores exacts
          </div>
        )}
      </div>

      {nextMatch ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: 'var(--navy-soft)', textTransform: 'uppercase' }}>
                Prochain match
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, marginTop: 4 }}>
                {nextMatch.homeClub} — {nextMatch.awayClub}
              </div>
            </div>
            <Link to={`/matchs/${nextMatch.id}`} className="btn btn-primary">Pronostiquer</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16, textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
          Aucun match à venir pour l'instant.
        </div>
      )}

      <div className="section-label">Classement</div>
      <div className="card">
        {leaderboard.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(15,31,61,0.06)' : 'none',
            }}
          >
            <div style={{ width: 20, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: i < 3 ? 'var(--gold)' : 'var(--navy-soft)', fontWeight: i < 3 ? 600 : 400 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13.5 }}>{p.pseudo}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: 'var(--navy-soft)' }}>{p.points} pts</div>
          </div>
        ))}
        <Link to="/joueurs" style={{ display: 'block', textAlign: 'center', padding: '10px 0 2px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: 'var(--blue)' }}>
          Voir tous les joueurs →
        </Link>
      </div>

      <Link
        to="/profil"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '18px 16px 0', padding: '12px 14px',
          background: 'rgba(27,63,160,0.04)', borderRadius: 13, textDecoration: 'none', color: 'var(--navy-soft)',
        }}
      >
        <div style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
          Mon profil, mes stats détaillées et mes réglages
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, opacity: 0.5 }}>›</div>
      </Link>

      <BottomNav />
    </div>
  );
}
