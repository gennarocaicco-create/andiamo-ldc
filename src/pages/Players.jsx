import { useEffect, useState } from 'react';
import { fetchPlayerLeaderboard, fetchPlayerRecentPredictions } from '../services/players.js';
import BottomNav from '../components/BottomNav.jsx';

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [recent, setRecent] = useState({});

  useEffect(() => {
    fetchPlayerLeaderboard().then((list) => {
      setPlayers(list);
      setLoading(false);
    });
  }, []);

  async function toggleOpen(playerId) {
    if (openId === playerId) {
      setOpenId(null);
      return;
    }
    setOpenId(playerId);
    if (!recent[playerId]) {
      const predictions = await fetchPlayerRecentPredictions(playerId);
      setRecent((prev) => ({ ...prev, [playerId]: predictions }));
    }
  }

  if (loading) return <div className="loading-screen">Chargement...</div>;

  return (
    <div className="app-shell">
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Joueurs</h1>
      </header>

      <div className="section-label">Classement</div>

      {players.map((player, i) => (
        <div key={player.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => toggleOpen(player.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 20, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: i < 3 ? 'var(--gold)' : 'var(--navy-soft)', fontWeight: i < 3 ? 600 : 400 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 14 }}>{player.pseudo}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: 'var(--navy-soft)' }}>{player.exactCount} scores exacts</div>
              {player.message && (
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontStyle: 'italic', fontSize: 10.5, color: '#8A6A16', marginTop: 3 }}>
                  ★ {player.message}
                </div>
              )}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 500 }}>{player.points} pts</div>
          </button>

          {openId === player.id && (
            <div style={{ background: '#F2F5FC', padding: '10px 18px 16px' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--navy-soft)', margin: '4px 0 6px' }}>
                10 derniers matchs
              </div>
              {(recent[player.id] || []).map((prediction) => (
                <div key={prediction.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(15,31,61,0.08)', fontSize: 12.5 }}>
                  <span>{prediction.predictedScore.home}-{prediction.predictedScore.away}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--navy-soft)' }}>
                    +{prediction.points ?? 0} pt{(prediction.points ?? 0) > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {(recent[player.id] || []).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--navy-soft)' }}>Aucun pronostic joué pour l'instant.</div>
              )}
            </div>
          )}
        </div>
      ))}

      <BottomNav />
    </div>
  );
}
