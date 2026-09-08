import { useEffect, useState } from 'react';
import {
  fetchPlayerLeaderboard,
  fetchPlayerRecentPredictions,
  fetchPlayerRawPredictions,
} from '../services/players.js';
import { fetchAllMatches } from '../services/matches.js';
import { fetchMyBonusPicks, fetchBonusResults } from '../services/bonus.js';
import { computeBonusBreakdown } from '../services/bonusScoring.js';
import { getClubCrestUrl } from '../services/clubCrests.js';
import PullToRefresh from '../components/PullToRefresh.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { getPageCache, setPageCache } from '../utils/pageCache.js';

const CACHE_KEY = 'players';

export default function Players() {
  const cached = getPageCache(CACHE_KEY);
  const [players, setPlayers] = useState(cached?.players ?? []);
  const [loading, setLoading] = useState(!cached);
  const [openId, setOpenId] = useState(null);
  const [recent, setRecent] = useState({});
  const [bonusInfo, setBonusInfo] = useState({}); // playerId -> { picks, breakdown, showDetail }
  const [crests, setCrests] = useState({});

  // Chargées une seule fois, réutilisées pour calculer le bonus de chaque joueur.
  const [matches, setMatches] = useState(cached?.matches ?? []);
  const [bonusResults, setBonusResults] = useState(cached?.bonusResults ?? null);

  async function load() {
    const [playerList, matchList, results] = await Promise.all([
      fetchPlayerLeaderboard(),
      fetchAllMatches(),
      fetchBonusResults(),
    ]);
    setPlayers(playerList);
    setMatches(matchList);
    setBonusResults(results);
    setPageCache(CACHE_KEY, { players: playerList, matches: matchList, bonusResults: results });
    // Les données par joueur (déjà ouvertes) peuvent être devenues obsolètes
    // (nouveau score, verrouillage, etc.) — on les recalculera à la prochaine
    // ouverture plutôt que de garder d'anciennes valeurs affichées.
    setRecent({});
    setBonusInfo({});
  }

  useEffect(() => {
    load().then(() => setLoading(false));
  }, []);

  async function toggleOpen(playerId) {
    if (openId === playerId) {
      setOpenId(null);
      return;
    }
    setOpenId(playerId);

    if (!recent[playerId]) {
      fetchPlayerRecentPredictions(playerId).then((predictions) => {
        setRecent((prev) => ({ ...prev, [playerId]: predictions }));
      });
    }

    if (!bonusInfo[playerId]) {
      const [picks, rawPredictions] = await Promise.all([
        fetchMyBonusPicks(playerId),
        fetchPlayerRawPredictions(playerId),
      ]);
      const breakdown = computeBonusBreakdown({
        matches,
        predictions: rawPredictions,
        bonusPicks: picks,
        bonusResults,
      });
      setBonusInfo((prev) => ({ ...prev, [playerId]: { picks, breakdown, showDetail: false } }));

      // Charge les écussons du Top 8 de ce joueur.
      (picks?.top8 || []).filter(Boolean).forEach((clubName) => {
        if (crests[clubName] !== undefined) return;
        getClubCrestUrl(clubName).then((url) => setCrests((prev) => ({ ...prev, [clubName]: url })));
      });
    }
  }

  function toggleBonusDetail(playerId) {
    setBonusInfo((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], showDetail: !prev[playerId].showDetail },
    }));
  }

  if (loading) return <div className="loading-screen">Chargement...</div>;

  return (
    <div className="app-shell">
      <PullToRefresh onRefresh={load}>
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Joueurs</h1>
      </header>

      <div className="section-label">Classement</div>

      {players.map((player, i) => {
        const info = bonusInfo[player.id];
        return (
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
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: 'var(--navy-soft)' }}>
                  {player.exactCount} scores exacts · {player.correctOnlyCount} bons résultats
                </div>
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
                {/* Stats : scores exacts / bons résultats / bonus */}
                <div style={{ display: 'flex', gap: 8, margin: '4px 0 12px' }}>
                  <StatPill label="Scores exacts" value={player.exactCount} />
                  <StatPill label="Bons résultats" value={player.correctOnlyCount} />
                  <StatPill label="Bonus" value={info ? `${info.breakdown.total >= 0 ? '+' : ''}${info.breakdown.total}` : '…'} highlight />
                </div>

                {info && (
                  <button
                    onClick={() => toggleBonusDetail(player.id)}
                    style={{
                      display: 'block', margin: '0 0 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                      color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {info.showDetail ? 'Masquer le détail des bonus ▲' : 'Voir le détail des bonus ▾'}
                  </button>
                )}

                {info?.showDetail && (
                  <div style={{ marginBottom: 14 }}>
                    {info.breakdown.breakdown.map((item) => (
                      <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed rgba(15,31,61,0.08)', fontSize: 12 }}>
                        <div>
                          <div>{item.label}</div>
                          {item.detail && (
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: 'var(--navy-soft)' }}>{item.detail}</div>
                          )}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: item.status === 'pending' ? 'var(--navy-soft)' : 'var(--win)' }}>
                          {item.status === 'pending' ? 'à venir' : `+${item.points} pt${item.points > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top 8 et meilleur buteur pronostiqués */}
                {info?.picks && (info.picks.top8?.some(Boolean) || info.picks.topScorer) && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--navy-soft)', marginBottom: 6 }}>
                      Pronostics avant-saison
                    </div>
                    {info.picks.top8?.filter(Boolean).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {info.picks.top8.map((clubName, rank) => clubName && (
                          <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 14, background: 'rgba(27,63,160,0.06)' }}>
                            {crests[clubName] ? (
                              <img src={crests[clubName]} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                            ) : (
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(15,31,61,0.1)' }} />
                            )}
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5 }}>{rank + 1}. {clubName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {info.picks.topScorer && (
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ color: 'var(--navy-soft)' }}>Meilleur buteur : </span>
                        <b>{info.picks.topScorer}</b>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--navy-soft)', margin: '4px 0 6px' }}>
                  10 derniers matchs
                </div>
                {(recent[player.id] || []).map((prediction) => (
                  <div key={prediction.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed rgba(15,31,61,0.08)', fontSize: 12.5, gap: 8 }}>
                    <span style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif" }}>{prediction.homeClub} — {prediction.awayClub}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                      {prediction.predictedScore.home}-{prediction.predictedScore.away}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--navy-soft)' }}>
                      +{prediction.points ?? 0} pt{(prediction.points ?? 0) > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
                {(recent[player.id] || []).length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--navy-soft)' }}>Aucun match verrouillé pour l'instant.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
      </PullToRefresh>

      <BottomNav />
    </div>
  );
}

function StatPill({ label, value, highlight }) {
  return (
    <div style={{ flex: 1, background: highlight ? 'rgba(201,162,39,0.12)' : '#fff', borderRadius: 10, padding: '7px 4px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: highlight ? '#8A6A16' : 'var(--navy)' }}>{value}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7.5, color: 'var(--navy-soft)', textTransform: 'uppercase', marginTop: 1 }}>{label}</div>
    </div>
  );
}
