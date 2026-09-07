import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyBonusPicks, saveMyBonusPicks } from '../services/bonus.js';
import BottomNav from '../components/BottomNav.jsx';

export default function Bonus() {
  const { profile } = useAuth();
  const [picks, setPicks] = useState({ top8: [], winner: '', finalist: '', topScorer: '' });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    fetchMyBonusPicks(profile.id).then((existing) => {
      if (existing) setPicks({ top8: existing.top8 || [], winner: existing.winner || '', finalist: existing.finalist || '', topScorer: existing.topScorer || '' });
    });
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setSavedMessage('');
    try {
      await saveMyBonusPicks(profile.id, picks);
      setSavedMessage('Pronostics enregistrés.');
    } catch (err) {
      setSavedMessage('Impossible d\'enregistrer — les bonus sont peut-être déjà verrouillés.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Bonus</h1>
      </header>

      <div className="section-label">Avant-saison</div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Top 8 de la phase de ligue</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>jusqu'à 16 pts</div>
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((rank) => (
          <input
            key={rank}
            className="field-input"
            style={{ marginBottom: 6 }}
            placeholder={`Club rang ${rank + 1}`}
            value={picks.top8[rank] || ''}
            onChange={(e) => {
              const next = [...picks.top8];
              next[rank] = e.target.value;
              setPicks({ ...picks, top8: next });
            }}
          />
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Vainqueur</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+12 pts</div>
        </div>
        <input className="field-input" placeholder="Club vainqueur" value={picks.winner} onChange={(e) => setPicks({ ...picks, winner: e.target.value })} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Finaliste</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+10 pts</div>
        </div>
        <input className="field-input" placeholder="Club finaliste" value={picks.finalist} onChange={(e) => setPicks({ ...picks, finalist: e.target.value })} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Meilleur buteur</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+10 pts</div>
        </div>
        <input className="field-input" placeholder="Nom du joueur" value={picks.topScorer} onChange={(e) => setPicks({ ...picks, topScorer: e.target.value })} />
      </div>

      <div style={{ padding: '0 16px' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-block">
          {saving ? 'Enregistrement...' : 'Enregistrer mes pronostics bonus'}
        </button>
        {savedMessage && <div className="error-text" style={{ textAlign: 'center' }}>{savedMessage}</div>}
      </div>

      <BottomNav />
    </div>
  );
}
