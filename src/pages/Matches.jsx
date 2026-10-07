import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchAllMatches } from '../services/matches.js';
import PullToRefresh from '../components/PullToRefresh.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { getPageCache, setPageCache } from '../utils/pageCache.js';

const CACHE_KEY = 'matches';

export default function Matches() {
  const { profile } = useAuth();
  const cached = getPageCache(CACHE_KEY);
  const [matches, setMatches] = useState(cached?.matches ?? []);
  const [myPredictions, setMyPredictions] = useState(cached?.myPredictions ?? {});
  const [loading, setLoading] = useState(!cached);
  const [selectedDay, setSelectedDay] = useState(cached?.selectedDay ?? null);

  async function load() {
    const list = await fetchAllMatches();

    // Une seule requête pour tous mes pronostics (au lieu d'une par match).
    const snap = await getDocs(query(collection(db, 'predictions'), where('uid', '==', profile.id)));
    const predictions = Object.fromEntries(snap.docs.map((d) => [d.data().matchId, { id: d.id, ...d.data() }]));

    setMatches(list);
    setMyPredictions(predictions);
    setPageCache(CACHE_KEY, { matches: list, myPredictions: predictions, selectedDay });
  }

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      if (!profile) return;
      await load();
      if (!cancelled) setLoading(false);
    }
    initialLoad();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (loading) return <div className="loading-screen">Chargement...</div>;

  const now = Date.now();

  // Journées disponibles ; par défaut : la première qui n'est pas entièrement terminée.
  const days = [...new Set(matches.map((m) => m.matchday).filter((d) => d != null))].sort((a, b) => a - b);
  const defaultDay =
    days.find((d) => matches.some((m) => m.matchday === d && m.status !== 'finished' && m.status !== 'cancelled')) ??
    days[days.length - 1] ??
    null;
  const activeDay = selectedDay ?? defaultDay;
  const visibleMatches = activeDay == null ? matches : matches.filter((m) => m.matchday === activeDay);

  return (
    <div className="app-shell">
      <PullToRefresh onRefresh={load}>
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Matchs</h1>
      </header>

      {days.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px 4px' }}>
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              style={{
                flex: '0 0 auto',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11.5,
                padding: '7px 13px',
                borderRadius: 20,
                cursor: 'pointer',
                border: '1.3px solid rgba(27,63,160,0.2)',
                background: d === activeDay ? 'var(--blue)' : '#fff',
                color: d === activeDay ? '#fff' : 'var(--blue)',
              }}
            >
              J{d}
            </button>
          ))}
        </div>
      )}

      <div className="section-label">{activeDay != null ? `Journée ${activeDay}` : 'Tous les matchs'}</div>

      {visibleMatches.map((match) => {
        const kickoff = match.kickoffAt?.toDate ? match.kickoffAt.toDate() : null;
        const locksAt = match.locksAt?.toDate ? match.locksAt.toDate() : null;
        const isLocked = locksAt ? now >= locksAt.getTime() : false;
        const myPrediction = myPredictions[match.id];

        let statusLabel = 'À pronostiquer';
        let statusColor = 'var(--gold)';
        if (match.status === 'finished') {
          statusLabel = myPrediction ? `+${myPrediction.points ?? 0} pt${(myPrediction.points ?? 0) > 1 ? 's' : ''}` : 'Terminé';
          statusColor = 'var(--win)';
        } else if (isLocked) {
          statusLabel = 'Verrouillé';
          statusColor = 'var(--lock)';
        } else if (myPrediction) {
          statusLabel = 'Pronostiqué';
          statusColor = 'var(--blue)';
        }

        return (
          <div className="card" key={match.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: 'var(--navy-soft)' }}>
                {kickoff ? kickoff.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: statusColor }}>{statusLabel}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13.5 }}>
                {match.homeClub} — {match.awayClub}
              </div>
              {match.status === 'finished' ? (
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>
                  {match.score?.home} – {match.score?.away}
                </div>
              ) : !isLocked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {myPrediction && (
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>
                      {myPrediction.predictedScore.home}-{myPrediction.predictedScore.away}
                    </div>
                  )}
                  <Link to={`/matchs/${match.id}`} className="btn btn-primary">
                    {myPrediction ? 'Modifier' : 'Pronostiquer'}
                  </Link>
                </div>
              ) : (
                myPrediction && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--gold)' }}>
                    {myPrediction.predictedScore.home}-{myPrediction.predictedScore.away}
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}

      {matches.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
          Aucun match pour l'instant — reviens plus tard.
        </div>
      )}
      </PullToRefresh>

      <BottomNav />
    </div>
  );
}
