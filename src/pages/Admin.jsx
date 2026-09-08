import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchAllMatches } from '../services/matches.js';
import { submitMatchScore } from '../services/adminScores.js';
import { fetchPlayerLeaderboard, setPlayerMessage } from '../services/players.js';
import { fetchRegistrationStatus, setRegistrationStatus } from '../services/registration.js';
import { fetchPreseasonLockStatus, lockPreseasonBonuses, unlockPreseasonBonuses } from '../services/preseasonLock.js';
import { fetchAuditLog, logAdminAction } from '../services/auditLog.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import BottomNav from '../components/BottomNav.jsx';

const TABS = ['Vue d\'ensemble', 'Scores', 'Joueurs', 'Calendrier'];

export default function Admin() {
  const { isOwner, profile } = useAuth();
  const tabs = isOwner ? [...TABS, 'Journal'] : TABS;
  const [tab, setTab] = useState(TABS[0]);
  const actor = profile ? { uid: profile.id, pseudo: profile.pseudo } : null;

  return (
    <div className="app-shell">
      <header style={{ padding: '26px 20px 4px' }}>
        <div className="eyebrow" style={{ color: 'var(--lock)' }}>Mode admin</div>
        <h1>Administration</h1>
      </header>

      <div
        style={{
          display: 'flex', gap: 8, padding: '16px 20px 12px', overflowX: 'auto',
          position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-bottom)',
          boxShadow: '0 8px 12px -8px rgba(15,31,61,0.12)',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: '9px 15px',
              borderRadius: 14, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: tab === t ? 'var(--lock)' : '#fff', color: tab === t ? '#fff' : 'var(--navy-soft)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Vue d\'ensemble' && <Overview actor={actor} />}
      {tab === 'Scores' && <ScoresTab actor={actor} />}
      {tab === 'Joueurs' && <PlayersTab isOwner={isOwner} actor={actor} />}
      {tab === 'Calendrier' && <CalendarTab />}
      {tab === 'Journal' && isOwner && <JournalTab />}

      <BottomNav />
    </div>
  );
}

function Overview({ actor }) {
  const [isOpen, setIsOpen] = useState(true);
  const [bonusLocked, setBonusLocked] = useState(false);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetchRegistrationStatus().then(setIsOpen);
    fetchPreseasonLockStatus().then(setBonusLocked);
    fetchPlayerLeaderboard().then(setPlayers);
  }, []);

  async function toggleRegistration() {
    const next = !isOpen;
    await setRegistrationStatus(next);
    setIsOpen(next);
  }

  async function toggleBonusLock() {
    const next = !bonusLocked;
    if (next) {
      await lockPreseasonBonuses();
    } else {
      await unlockPreseasonBonuses();
    }
    setBonusLocked(next);
    if (actor) {
      await logAdminAction(actor, 'lock', next ? 'Bonus avant-saison verrouillés (Top 8, Vainqueur, Finaliste, Buteur)' : 'Bonus avant-saison déverrouillés');
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0' }}>
        <StatCard num={players.length} label="Joueurs" />
        <StatCard num={players.filter((p) => p.role === 'admin' || p.role === 'owner').length} label="Admins" />
      </div>

      <div className="card" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13.5 }}>
            {isOpen ? 'Inscriptions ouvertes' : 'Inscriptions verrouillées'}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: isOpen ? 'var(--navy-soft)' : 'var(--lock)' }}>
            {isOpen ? 'Les joueurs peuvent encore s\'inscrire' : 'Plus aucune nouvelle inscription possible'}
          </div>
        </div>
        <button
          onClick={toggleRegistration}
          style={{
            width: 46, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer', position: 'relative',
            background: isOpen ? 'var(--win)' : 'rgba(15,31,61,0.15)',
          }}
        >
          <div style={{ position: 'absolute', top: 3, left: isOpen ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>

      <div className="card" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13.5 }}>
            {bonusLocked ? 'Bonus avant-saison verrouillés' : 'Bonus avant-saison ouverts'}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: bonusLocked ? 'var(--lock)' : 'var(--navy-soft)' }}>
            Top 8 · Vainqueur · Finaliste · Meilleur buteur
          </div>
        </div>
        <button
          onClick={toggleBonusLock}
          style={{
            width: 46, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer', position: 'relative',
            background: bonusLocked ? 'var(--lock)' : 'var(--win)',
          }}
        >
          <div style={{ position: 'absolute', top: 3, left: bonusLocked ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>
    </>
  );
}

function StatCard({ num, label }) {
  return (
    <div className="card" style={{ flex: 1, margin: 0, textAlign: 'center', padding: '12px 8px' }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>{num}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7.8, color: 'var(--navy-soft)', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function ScoresTab({ actor }) {
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchAllMatches().then(setMatches);
  }, []);

  async function handleSave(matchId) {
    const { home, away } = scores[matchId] || {};
    if (home === undefined || away === undefined) return;
    setSavingId(matchId);
    await submitMatchScore(matchId, { home: Number(home), away: Number(away) }, 'finished', actor);
    const list = await fetchAllMatches();
    setMatches(list);
    setSavingId(null);
  }

  const pending = matches.filter((m) => m.status !== 'finished');

  return (
    <>
      <div className="section-label">À saisir</div>
      {pending.map((match) => (
        <div className="card" key={match.id}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>
            {match.homeClub} – {match.awayClub}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <input
              type="number" min="0" className="field-input" style={{ width: 60, textAlign: 'center' }}
              onChange={(e) => setScores((s) => ({ ...s, [match.id]: { ...s[match.id], home: e.target.value } }))}
            />
            <span style={{ alignSelf: 'center' }}>–</span>
            <input
              type="number" min="0" className="field-input" style={{ width: 60, textAlign: 'center' }}
              onChange={(e) => setScores((s) => ({ ...s, [match.id]: { ...s[match.id], away: e.target.value } }))}
            />
          </div>
          <button onClick={() => handleSave(match.id)} disabled={savingId === match.id} className="btn btn-block" style={{ background: 'var(--win)', color: '#fff', marginTop: 10 }}>
            {savingId === match.id ? 'Enregistrement...' : 'Valider le score'}
          </button>
        </div>
      ))}
      {pending.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)' }}>Aucun match en attente.</div>}
    </>
  );
}

function PlayersTab({ isOwner, actor }) {
  const [players, setPlayers] = useState([]);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [openMessageId, setOpenMessageId] = useState(null);

  useEffect(() => {
    fetchPlayerLeaderboard().then(setPlayers);
  }, []);

  async function handleSetRole(playerId, role, playerPseudo) {
    await updateDoc(doc(db, 'users', playerId), { role });
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, role } : p)));
    if (actor) {
      const label = role === 'admin' ? `${playerPseudo} promu admin` : `${playerPseudo} rétrogradé joueur`;
      await logAdminAction(actor, 'role', label);
    }
  }

  async function handleSaveMessage(playerId) {
    const text = messageDrafts[playerId] ?? '';
    await setPlayerMessage(playerId, text.trim(), actor);
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, message: text.trim() || null } : p)));
    setOpenMessageId(null);
  }

  return (
    <>
      <div className="section-label">Tous les joueurs</div>
      {players.map((player) => (
        <div className="card" key={player.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13.5 }}>{player.pseudo}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--navy-soft)' }}>
                {player.role === 'owner' ? '👑 Propriétaire' : player.role === 'admin' ? '★ Admin' : `Joueur · ${player.points} pts`}
              </div>
            </div>

            <button
              onClick={() => setOpenMessageId(openMessageId === player.id ? null : player.id)}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '6px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', background: player.message ? 'var(--gold)' : 'rgba(201,162,39,0.12)', color: player.message ? '#fff' : '#8A6A16' }}
            >
              Message
            </button>

            {isOwner && player.role !== 'owner' && (
              player.role === 'admin' ? (
                <button onClick={() => handleSetRole(player.id, 'player', player.pseudo)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '6px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(184,69,47,0.09)', color: 'var(--lock)' }}>
                  Retirer
                </button>
              ) : (
                <button onClick={() => handleSetRole(player.id, 'admin', player.pseudo)} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '6px 11px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(27,63,160,0.08)', color: 'var(--blue)' }}>
                  Rendre admin
                </button>
              )
            )}
          </div>

          {openMessageId === player.id && (
            <div style={{ marginTop: 10 }}>
              <textarea
                className="field-input"
                rows={2}
                defaultValue={player.message || ''}
                onChange={(e) => setMessageDrafts((d) => ({ ...d, [player.id]: e.target.value }))}
                placeholder="Écrire un message d'encouragement..."
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => { setMessageDrafts((d) => ({ ...d, [player.id]: '' })); handleSaveMessage(player.id); }} style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11.5, color: 'var(--lock)', background: 'rgba(184,69,47,0.08)', border: '1.3px solid rgba(184,69,47,0.25)', padding: 7, borderRadius: 9, cursor: 'pointer' }}>
                  Supprimer
                </button>
                <button onClick={() => handleSaveMessage(player.id)} style={{ flex: 2, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11.5, color: '#fff', background: 'var(--gold)', border: 'none', padding: 8, borderRadius: 9, cursor: 'pointer' }}>
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function CalendarTab() {
  return (
    <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
      La gestion du calendrier (journées, bonus avant-saison) arrive dans une prochaine version.
    </div>
  );
}

const ACTION_LABELS = {
  score: { icon: '⚽', color: 'var(--win)' },
  role: { icon: '★', color: 'var(--blue)' },
  message: { icon: '✎', color: '#8A6A16' },
  lock: { icon: '🔒', color: 'var(--lock)' },
};

function JournalTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog().then((list) => {
      setEntries(list);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)' }}>Chargement...</div>;

  return (
    <>
      <div className="section-label">Journal des actions admin (100 dernières)</div>
      {entries.map((entry) => {
        const meta = ACTION_LABELS[entry.action] || { icon: '•', color: 'var(--navy-soft)' };
        const date = entry.createdAt?.toDate ? entry.createdAt.toDate() : null;
        return (
          <div className="card" key={entry.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 16px' }}>
            <div style={{ fontSize: 15, color: meta.color, marginTop: 1 }}>{meta.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 12.5 }}>
                {entry.description}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: 'var(--navy-soft)', marginTop: 2 }}>
                par {entry.actorPseudo}
                {date ? ` · ${date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
              </div>
            </div>
          </div>
        );
      })}
      {entries.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--navy-soft)', fontSize: 13 }}>
          Aucune action enregistrée pour l'instant.
        </div>
      )}
    </>
  );
}
