import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { rankPlayers, tieBreakValue } from '../utils/scoring.js';

/**
 * Calcule le classement des joueurs à partir de leurs pronostics.
 * Fait exprès de tout recalculer à l'affichage plutôt que de stocker un
 * "total" séparé — simple et fiable tant que le nombre de joueurs reste
 * petit (50-100).
 */
export async function fetchPlayerLeaderboard() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const players = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const predictionsSnap = await getDocs(collection(db, 'predictions'));
  const predictionsByUser = new Map();
  predictionsSnap.forEach((d) => {
    const prediction = d.data();
    const list = predictionsByUser.get(prediction.uid) || [];
    list.push(prediction);
    predictionsByUser.set(prediction.uid, list);
  });

  const withScores = players.map((player) => {
    const myPredictions = predictionsByUser.get(player.id) || [];
    const points = myPredictions.reduce((sum, p) => sum + (p.points || 0), 0);
    const tieBreak = tieBreakValue(myPredictions.map((p) => ({
      exact: !!p.exact,
      correctResult: !!p.correctResult,
    })));
    const exactCount = myPredictions.filter((p) => p.exact).length;

    return { ...player, points, tieBreak, exactCount, predictionsCount: myPredictions.length };
  });

  return rankPlayers(withScores);
}

/** Récupère les 10 derniers pronostics joués d'un joueur (pour le détail déplié). */
export async function fetchPlayerRecentPredictions(uid) {
  const q = query(collection(db, 'predictions'), where('uid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 10);
}

/** Admin : écrit/efface le message d'encouragement public d'un joueur. */
export async function setPlayerMessage(uid, message) {
  await updateDoc(doc(db, 'users', uid), { message: message || null });
}
