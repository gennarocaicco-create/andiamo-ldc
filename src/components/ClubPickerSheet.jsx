import { useEffect, useState } from 'react';
import { getClubCrestUrl } from '../services/clubCrests.js';

/**
 * Feuille déroulante en bas d'écran pour choisir un club dans la liste des
 * 36, avec écusson officiel et recherche. `clubs` est un tableau de noms.
 */
export default function ClubPickerSheet({ clubs, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [crests, setCrests] = useState({});

  useEffect(() => {
    let cancelled = false;
    clubs.forEach((name) => {
      getClubCrestUrl(name).then((url) => {
        if (!cancelled) setCrests((prev) => ({ ...prev, [name]: url }));
      });
    });
    return () => { cancelled = true; };
  }, [clubs]);

  const filtered = clubs.filter((name) => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.55)', zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0',
          maxHeight: '78vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 16px 10px' }}>
          <input
            className="field-input"
            placeholder="Rechercher un club..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ overflowY: 'auto', padding: '0 8px 20px' }}>
          {filtered.map((name) => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 10,
              }}
            >
              {crests[name] ? (
                <img src={crests[name]} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,31,61,0.08)', flexShrink: 0 }} />
              )}
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>{name}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--navy-soft)', fontSize: 13 }}>
              Aucun club ne correspond.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
