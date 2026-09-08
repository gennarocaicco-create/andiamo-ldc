import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyBonusPicks, saveMyBonusPicks } from '../services/bonus.js';
import { fetchClubNames } from '../services/clubs.js';
import { getClubCrestUrl } from '../services/clubCrests.js';
import { fetchPreseasonLockStatus } from '../services/preseasonLock.js';
import ClubPickerSheet from '../components/ClubPickerSheet.jsx';
import BottomNav from '../components/BottomNav.jsx';

export default function Bonus() {
  const { profile } = useAuth();
  const [picks, setPicks] = useState({ top8: [], winner: '', finalist: '', topScorer: '' });
  const [clubNames, setClubNames] = useState([]);
  const [crests, setCrests] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  // null = fermé, 'winner' | 'finalist' | {top8: index} = ouvert pour ce champ
  const [pickerFor, setPickerFor] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchMyBonusPicks(profile.id),
      fetchClubNames(),
      fetchPreseasonLockStatus(),
    ]).then(([existing, names, isLocked]) => {
      if (existing) setPicks({ top8: existing.top8 || [], winner: existing.winner || '', finalist: existing.finalist || '', topScorer: existing.topScorer || '' });
      setClubNames(names);
      setLocked(isLocked);
      setLoading(false);
    });
  }, [profile]);

  // Charge l'écusson de chaque club déjà sélectionné (pour l'affichage).
  useEffect(() => {
    const selected = [picks.winner, picks.finalist, ...picks.top8].filter(Boolean);
    selected.forEach((name) => {
      if (crests[name] !== undefined) return;
      getClubCrestUrl(name).then((url) => setCrests((prev) => ({ ...prev, [name]: url })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks.winner, picks.finalist, picks.top8]);

  function handlePick(clubName) {
    if (pickerFor === 'winner') {
      setPicks((p) => ({ ...p, winner: clubName }));
    } else if (pickerFor === 'finalist') {
      setPicks((p) => ({ ...p, finalist: clubName }));
    } else if (pickerFor && typeof pickerFor === 'object' && 'top8' in pickerFor) {
      setPicks((p) => {
        const next = [...p.top8];
        next[pickerFor.top8] = clubName;
        return { ...p, top8: next };
      });
    }
    setPickerFor(null);
  }

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

  if (loading) return <div className="loading-screen">Chargement...</div>;

  // Bonus verrouillés : vue figée en lecture seule, aucune modification
  // possible, quel que soit le chemin emprunté pour arriver sur cet écran.
  if (locked) {
    return (
      <div className="app-shell">
        <header style={{ padding: '26px 20px 4px' }}>
          <div className="eyebrow" style={{ color: 'var(--lock)' }}>Verrouillés</div>
          <h1>Bonus</h1>
        </header>

        <div className="card" style={{ textAlign: 'center', color: 'var(--lock)', fontSize: 12.5 }}>
          🔒 Les bonus avant-saison sont verrouillés — plus aucune modification possible.
        </div>

        <div className="section-label">Top 8 de la phase de ligue</div>
        <div className="card">
          {picks.top8.filter(Boolean).length === 0 ? (
            <div style={{ color: 'var(--navy-soft)', fontSize: 13 }}>Tu n'avais rien renseigné.</div>
          ) : (
            picks.top8.map((clubName, rank) => clubName && (
              <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
                {crests[clubName] ? (
                  <img src={crests[clubName]} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(15,31,61,0.08)' }} />
                )}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>{rank + 1}. {clubName}</span>
              </div>
            ))
          )}
        </div>

        <div className="section-label">Vainqueur & Finaliste</div>
        <div className="card">
          <ReadOnlyClubLine label="Vainqueur" value={picks.winner} crestUrl={picks.winner ? crests[picks.winner] : null} />
          <ReadOnlyClubLine label="Finaliste" value={picks.finalist} crestUrl={picks.finalist ? crests[picks.finalist] : null} />
        </div>

        <div className="section-label">Meilleur buteur</div>
        <div className="card">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>
            {picks.topScorer || <span style={{ color: 'var(--navy-soft)' }}>Tu n'avais rien renseigné.</span>}
          </div>
        </div>

        <BottomNav />
      </div>
    );
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
          <ClubSlotButton
            key={rank}
            placeholder={`Club rang ${rank + 1}`}
            value={picks.top8[rank]}
            crestUrl={picks.top8[rank] ? crests[picks.top8[rank]] : null}
            onClick={() => setPickerFor({ top8: rank })}
          />
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Vainqueur</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+12 pts</div>
        </div>
        <ClubSlotButton
          placeholder="Club vainqueur"
          value={picks.winner}
          crestUrl={picks.winner ? crests[picks.winner] : null}
          onClick={() => setPickerFor('winner')}
        />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Finaliste</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+10 pts</div>
        </div>
        <ClubSlotButton
          placeholder="Club finaliste"
          value={picks.finalist}
          crestUrl={picks.finalist ? crests[picks.finalist] : null}
          onClick={() => setPickerFor('finalist')}
        />
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

      {pickerFor && (
        <ClubPickerSheet
          clubs={clubNames}
          onSelect={handlePick}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}

/** Champ cliquable façon input, qui ouvre le sélecteur de clubs et affiche l'écusson une fois choisi. */
function ClubSlotButton({ placeholder, value, crestUrl, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="field-input"
      style={{
        marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        cursor: 'pointer', color: value ? 'var(--navy)' : 'rgba(15,31,61,0.4)',
      }}
    >
      {value ? (
        crestUrl ? (
          <img src={crestUrl} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(15,31,61,0.08)', flexShrink: 0 }} />
        )
      ) : null}
      <span>{value || placeholder}</span>
    </button>
  );
}

/** Ligne figée (lecture seule) affichant un club choisi, avec son écusson. */
function ReadOnlyClubLine({ label, value, crestUrl }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--navy-soft)', width: 70, flexShrink: 0 }}>{label}</div>
      {value ? (
        <>
          {crestUrl ? (
            <img src={crestUrl} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(15,31,61,0.08)' }} />
          )}
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>{value}</span>
        </>
      ) : (
        <span style={{ color: 'var(--navy-soft)', fontSize: 13 }}>Non renseigné</span>
      )}
    </div>
  );
}
