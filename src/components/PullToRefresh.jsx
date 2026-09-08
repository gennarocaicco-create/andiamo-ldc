import { useRef, useState } from 'react';

const THRESHOLD = 70; // px de tirage nécessaire pour déclencher l'actualisation

/**
 * Enveloppe un écran pour lui ajouter le geste "tirer vers le bas pour
 * actualiser". Nécessaire car ce geste natif du navigateur est désactivé
 * une fois l'appli ajoutée à l'écran d'accueil (mode "standalone").
 *
 * `onRefresh` doit être une fonction (async ou non) qui recharge les
 * données de l'écran.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const tracking = useRef(false);

  function handleTouchStart(e) {
    if (window.scrollY > 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    tracking.current = true;
  }

  function handleTouchMove(e) {
    if (!tracking.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(delta * 0.5, 100));
    }
  }

  async function handleTouchEnd() {
    if (!tracking.current) return;
    tracking.current = false;
    startY.current = null;

    if (pullDistance > THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        style={{
          height: pullDistance,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', transition: refreshing ? 'none' : 'height 0.2s ease',
        }}
      >
        {pullDistance > 8 && (
          <div
            style={{
              width: 22, height: 22, borderRadius: '50%',
              border: '2.5px solid rgba(15,31,61,0.15)', borderTopColor: 'var(--blue)',
              animation: (refreshing || pullDistance >= THRESHOLD) ? 'ptr-spin 0.7s linear infinite' : 'none',
              transform: refreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
            }}
          />
        )}
      </div>
      {children}
      <style>{'@keyframes ptr-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
