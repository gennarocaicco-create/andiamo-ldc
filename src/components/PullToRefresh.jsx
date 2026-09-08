import { useRef, useState } from 'react';

const THRESHOLD = 55; // px de tirage nécessaire pour déclencher l'actualisation
const PULL_MULTIPLIER = 0.8; // résistance du geste (plus haut = tire moins fort)

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
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Une fois le geste démarré, on ne re-vérifie plus window.scrollY ici :
    // un léger rebond natif du navigateur (surtout sur iPhone) peut le
    // faire bouger d'un pixel en cours de route, ce qui coupait le geste
    // à mi-chemin avant cette correction.
    setPullDistance(Math.min(delta * PULL_MULTIPLIER, THRESHOLD));
  }

  async function handleTouchEnd() {
    if (!tracking.current) return;
    tracking.current = false;
    startY.current = null;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
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

  const ready = pullDistance >= THRESHOLD;

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        style={{
          height: refreshing ? THRESHOLD : pullDistance,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', transition: refreshing || pullDistance === 0 ? 'height 0.2s ease' : 'none',
        }}
      >
        {(pullDistance > 4 || refreshing) && (
          <div
            style={{
              width: 22, height: 22, borderRadius: '50%',
              border: '2.5px solid rgba(15,31,61,0.15)',
              borderTopColor: (ready || refreshing) ? 'var(--blue)' : 'rgba(27,63,160,0.5)',
              animation: (refreshing || ready) ? 'ptr-spin 0.7s linear infinite' : 'none',
              transform: (refreshing || ready) ? 'none' : `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
            }}
          />
        )}
      </div>
      {children}
      <style>{'@keyframes ptr-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
