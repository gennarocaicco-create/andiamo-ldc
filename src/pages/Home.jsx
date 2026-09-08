import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchPlayerLeaderboard } from '../services/players.js';
import { fetchCommunityPicks } from '../services/communityPicks.js';
import { signOut } from '../services/auth.js';
import ScorePickersSheet from '../components/ScorePickersSheet.jsx';
import BottomNav from '../components/BottomNav.jsx';

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [communityPicks, setCommunityPicks] = useState([]);
  const [openGroup, setOpenGroup] = useState(null); // { title, pseudos } | null
  const [loading, setLoading] = useState(true);

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const players = await fetchPlayerLeaderboard();
      if (cancelled) return;

      setLeaderboard(players.slice(0, 5));
      const myIndex = players.findIndex((p) => p.id === profile?.id);
      setMyRank(myIndex >= 0 ? { rank: myIndex + 1, total: players.length, ...players[myIndex] } : null);

      const playersById = new Map(players.map((p) => [p.id, p]));
      const picks = await fetchCommunityPicks(playersById);
      if (cancelled) return;
      setCommunityPicks(picks);

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

      <div className="section-label">Pronostics de la communauté</div>
      {communityPicks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
          Aucun match verrouillé pour l'instant.
        </div>
      ) : (
        communityPicks.map((match) => (
          <div className="card" key={match.matchId}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
              {match.homeClub} — {match.awayClub}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {match.scoreGroups.map((group) => (
                <button
                  key={group.score}
                  onClick={() => setOpenGroup({
                    title: `${match.homeClub} — ${match.awayClub} · ${group.score}`,
                    pseudos: group.pseudos,
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 20,
                    background: 'rgba(27,63,160,0.07)', border: 'none', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 600, color: 'var(--blue)' }}>
                    {group.score}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: 'var(--navy-soft)' }}>
                    {group.pseudos.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))
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

      <div style={{ display: 'flex', gap: 8, margin: '18px 16px 0' }}>
        <Link
          to="/profil"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            background: 'rgba(27,63,160,0.04)', borderRadius: 13, textDecoration: 'none', color: 'var(--navy-soft)',
          }}
        >
          <div style={{ flex: 1, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
            Mon profil, mes stats détaillées et mes réglages
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, opacity: 0.5 }}>›</div>
        </Link>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px',
            background: 'rgba(184,69,47,0.08)', borderRadius: 13, border: 'none', cursor: 'pointer',
            color: 'var(--lock)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, whiteSpace: 'nowrap',
          }}
        >
          Se déconnecter
        </button>
      </div>

      <BottomNav />

      {openGroup && (
        <ScorePickersSheet
          title={openGroup.title}
          pseudos={openGroup.pseudos}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}
