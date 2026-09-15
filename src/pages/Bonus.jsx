import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyBonusPicks, saveMyBonusPicks } from '../services/bonus.js';
import { fetchClubNames } from '../services/clubs.js';
import { getClubCrestUrl } from '../services/clubCrests.js';
import { fetchBonusLocks } from '../services/bonusLocks.js';
import ClubPickerSheet from '../components/ClubPickerSheet.jsx';
import PullToRefresh from '../components/PullToRefresh.jsx';
import BottomNav from '../components/BottomNav.jsx';
import { getPageCache, setPageCache } from '../utils/pageCache.js';

const CACHE_KEY = 'bonus';
const EMPTY_PICKS = { top8: [], winner: '', finalist: '', topScorer: '' };
const EMPTY_LOCKS = { top8: false, winner: false, finalist: false, topScorer: false };

export default function Bonus() {
  const { profile } = useAuth();
  const cached = getPageCache(CACHE_KEY);
  const [picks, setPicks] = useState(cached?.picks ?? EMPTY_PICKS);
  const [clubNames, setClubNames] = useState(cached?.clubNames ?? []);
  const [crests, setCrests] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [locks, setLocks] = useState(cached?.locks ?? EMPTY_LOCKS);
  const [loading, setLoading] = useState(!cached);
  // null = fermé, 'winner' | 'finalist' | {top8: index} = ouvert pour ce champ
  const [pickerFor, setPickerFor] = useState(null);

  async function load() {
    const [existing, names, bonusLocks] = await Promise.all([
      fetchMyBonusPicks(profile.id),
      fetchClubNames(),
      fetchBonusLocks(),
    ]);
    const nextPicks = existing
      ? { top8: existing.top8 || [], winner: existing.winner || '', finalist: existing.finalist || '', topScorer: existing.topScorer || '' }
      : EMPTY_PICKS;

    setPicks(nextPicks);
    setClubNames(names);
    setLocks(bonusLocks);
    setPageCache(CACHE_KEY, { picks: nextPicks, clubNames: names, locks: bonusLocks });
  }

  useEffect(() => {
    load().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setSavedMessage('Impossible d\'enregistrer — vérifie qu\'aucune des catégories modifiées n\'est verrouillée.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-screen">Chargement...</div>;

  const allLocked = locks.top8 && locks.winner && locks.finalist && locks.topScorer;

  return (
    <div className="app-shell">
      <PullToRefresh onRefresh={load}>
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow">Ligue des Champions</div>
        <h1>Bonus</h1>
      </header>

      <div className="section-label">Avant-saison</div>

      {/* Top 8 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Top 8 de la phase de ligue</div>
            {locks.top8 && <LockBadge />}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>jusqu'à 16 pts</div>
        </div>
        {locks.top8 ? (
          picks.top8.filter(Boolean).length === 0 ? (
            <div style={{ color: 'var(--navy-soft)', fontSize: 13 }}>Tu n'avais rien renseigné.</div>
          ) : (
            picks.top8.map((clubName, rank) => clubName && (
              <ReadOnlyClubRow key={rank} label={`${rank + 1}.`} value={clubName} crestUrl={crests[clubName]} />
            ))
          )
        ) : (
          [0, 1, 2, 3, 4, 5, 6, 7].map((rank) => (
            <ClubSlotButton
              key={rank}
              placeholder={`Club rang ${rank + 1}`}
              value={picks.top8[rank]}
              crestUrl={picks.top8[rank] ? crests[picks.top8[rank]] : null}
              onClick={() => setPickerFor({ top8: rank })}
            />
          ))
        )}
      </div>

      {/* Vainqueur */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Vainqueur</div>
            {locks.winner && <LockBadge />}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+12 pts</div>
        </div>
        {locks.winner ? (
          <ReadOnlyClubRow value={picks.winner} crestUrl={picks.winner ? crests[picks.winner] : null} />
        ) : (
          <ClubSlotButton
            placeholder="Club vainqueur"
            value={picks.winner}
            crestUrl={picks.winner ? crests[picks.winner] : null}
            onClick={() => setPickerFor('winner')}
          />
        )}
      </div>

      {/* Finaliste */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Finaliste</div>
            {locks.finalist && <LockBadge />}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+10 pts</div>
        </div>
        {locks.finalist ? (
          <ReadOnlyClubRow value={picks.finalist} crestUrl={picks.finalist ? crests[picks.finalist] : null} />
        ) : (
          <ClubSlotButton
            placeholder="Club finaliste"
            value={picks.finalist}
            crestUrl={picks.finalist ? crests[picks.finalist] : null}
            onClick={() => setPickerFor('finalist')}
          />
        )}
      </div>

      {/* Meilleur buteur */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Meilleur buteur</div>
            {locks.topScorer && <LockBadge />}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: '#8A6A16' }}>+10 pts</div>
        </div>
        {locks.topScorer ? (
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>
            {picks.topScorer || <span style={{ color: 'var(--navy-soft)' }}>Tu n'avais rien renseigné.</span>}
          </div>
        ) : (
          <input className="field-input" placeholder="Nom du joueur" value={picks.topScorer} onChange={(e) => setPicks({ ...picks, topScorer: e.target.value })} />
        )}
      </div>

      {allLocked ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--lock)', fontSize: 12.5 }}>
          🔒 Tous les bonus avant-saison sont verrouillés.
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-block">
            {saving ? 'Enregistrement...' : 'Enregistrer mes pronostics bonus'}
          </button>
          {savedMessage && <div className="error-text" style={{ textAlign: 'center' }}>{savedMessage}</div>}
        </div>
      )}
      </PullToRefresh>

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

function LockBadge() {
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--lock)' }}>🔒</span>
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
function ReadOnlyClubRow({ label, value, crestUrl }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      {label && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--navy-soft)', width: 18, flexShrink: 0 }}>{label}</div>
      )}
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
