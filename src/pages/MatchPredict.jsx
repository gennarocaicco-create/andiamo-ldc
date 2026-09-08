import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMatch, fetchMyPrediction, submitPrediction } from '../services/matches.js';

export default function MatchPredict() {
  const { matchId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [existingPrediction, setExistingPrediction] = useState(null);
  const [home, setHome] = useState(1);
  const [away, setAway] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [m, prediction] = await Promise.all([
        fetchMatch(matchId),
        fetchMyPrediction(matchId, profile.id),
      ]);
      if (cancelled) return;
      setMatch(m);
      setExistingPrediction(prediction);
      if (prediction) {
        setHome(prediction.predictedScore.home);
        setAway(prediction.predictedScore.away);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [matchId, profile]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await submitPrediction(matchId, profile.id, { home, away });
      navigate('/matchs');
    } catch (err) {
      setError('Impossible d\'enregistrer — le match est peut-être déjà verrouillé.');
    } finally {
      setSaving(false);
    }
  }

  if (!match) return <div className="loading-screen">Chargement...</div>;

  const locksAt = match.locksAt?.toDate ? match.locksAt.toDate().getTime() : null;
  const isLocked = locksAt !== null && Date.now() >= locksAt;

  // Le match est verrouillé (en cours, à moins de 30 min du coup d'envoi,
  // ou terminé) : plus aucune modification possible, on affiche juste le
  // pronostic figé, sans stepper ni bouton de sauvegarde.
  if (isLocked) {
    return (
      <div className="app-shell">
        <header style={{ padding: '26px 20px 4px' }}>
          <div className="eyebrow" style={{ color: 'var(--lock)' }}>Match verrouillé</div>
          <h1>{match.homeClub} — {match.awayClub}</h1>
        </header>

        <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
          {existingPrediction ? (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: 'var(--navy-soft)', textTransform: 'uppercase', marginBottom: 10 }}>
                Ton pronostic (figé)
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700 }}>
                {existingPrediction.predictedScore.home} – {existingPrediction.predictedScore.away}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--navy-soft)', fontSize: 13, padding: '10px 0' }}>
              Tu n'avais pas pronostiqué ce match avant le verrouillage.
            </div>
          )}
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--lock)', marginTop: 14 }}>
            Ce match a commencé ou est sur le point de commencer — les pronostics ne sont plus modifiables.
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          <Link to="/matchs" className="btn btn-primary btn-block" style={{ display: 'block', textAlign: 'center' }}>
            Retour aux matchs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 110 }}>
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ton pronostic</div>
        <h1>{match.homeClub} — {match.awayClub}</h1>
      </header>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: 'var(--navy-soft)', textTransform: 'uppercase', marginBottom: 16 }}>
          Ton pronostic
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <ScoreStepper value={home} onChange={setHome} />
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, color: 'var(--line-elim)' }}>:</div>
          <ScoreStepper value={away} onChange={setAway} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: '7px 12px', borderRadius: 20, background: 'rgba(201,162,39,0.1)', color: '#8A6A16' }}>
            <b>+2</b> pts si score exact
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: '7px 12px', borderRadius: 20, background: 'rgba(27,63,160,0.07)', color: 'var(--blue)' }}>
            <b>+1</b> pt si bon résultat
          </div>
        </div>

        {error && <div className="error-text" style={{ textAlign: 'center' }}>{error}</div>}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', padding: '14px 16px 22px', background: 'linear-gradient(180deg, rgba(248,250,255,0) 0%, #F8FAFF 30%)' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-block">
          {saving ? 'Enregistrement...' : 'Valider mon pronostic'}
        </button>
      </div>
    </div>
  );
}

function ScoreStepper({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        onClick={() => onChange(Math.min(9, value + 1))}
        style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(27,63,160,0.07)', color: 'var(--blue)', border: 'none', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}
      >
        +
      </button>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, width: 48, textAlign: 'center' }}>{value}</div>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(27,63,160,0.07)', color: 'var(--blue)', border: 'none', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}
      >
        –
      </button>
    </div>
  );
}
