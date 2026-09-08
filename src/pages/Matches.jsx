import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchAllMatches, fetchMyPrediction } from '../services/matches.js';
import PullToRefresh from '../components/PullToRefresh.jsx';
import BottomNav from '../components/BottomNav.jsx';

export default function Matches() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState([]);
  const [myPredictions, setMyPredictions] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const list = await fetchAllMatches();
    setMatches(list);

    const entries = await Promise.all(
      list.map(async (m) => [m.id, await fetchMyPrediction(m.id, profile.id)])
    );
    setMyPredictions(Object.fromEntries(entries.filter(([, v]) => v)));
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

  return (
    <div className="app-shell">
      <PullToRefresh onRefresh={load}>
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Matchs</h1>
      </header>

      <div className="section-label">Tous les matchs</div>

      {matches.map((match) => {
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
