import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { rankPlayers, tieBreakValue } from '../utils/scoring.js';
import { logAdminAction } from './auditLog.js';

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

/**
 * Récupère les derniers pronostics "visibles" d'un joueur, pour le détail
 * déplié de l'écran Joueurs : uniquement les matchs déjà verrouillés (en
 * cours, à moins de 30 min du coup d'envoi, ou terminés) — jamais un match
 * plus tardif dans la journée, pour ne pas dévoiler un pronostic à venir.
 */
export async function fetchPlayerRecentPredictions(uid) {
  const [predictionsSnap, matchesSnap] = await Promise.all([
    getDocs(query(collection(db, 'predictions'), where('uid', '==', uid))),
    getDocs(collection(db, 'matches')),
  ]);

  const matchesById = new Map();
  matchesSnap.forEach((d) => matchesById.set(d.id, { id: d.id, ...d.data() }));

  const now = Date.now();

  return predictionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.matchId) }))
    .filter(({ match }) => {
      if (!match) return false;
      const locksAt = match.locksAt?.toDate ? match.locksAt.toDate().getTime() : null;
      // Verrouillé = déjà passé l'heure de verrouillage (30 min avant le
      // coup d'envoi), donc soit sur le point de commencer, soit en cours,
      // soit terminé.
      return locksAt !== null && now >= locksAt;
    })
    .sort((a, b) => {
      const aTime = a.match.kickoffAt?.toDate ? a.match.kickoffAt.toDate().getTime() : 0;
      const bTime = b.match.kickoffAt?.toDate ? b.match.kickoffAt.toDate().getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10)
    .map(({ prediction, match }) => ({
      id: prediction.id,
      predictedScore: prediction.predictedScore,
      points: prediction.points,
      homeClub: match.homeClub,
      awayClub: match.awayClub,
    }));
}

/**
 * Admin : écrit/efface le message d'encouragement public d'un joueur.
 * @param {string} uid
 * @param {string} message
 * @param {{uid:string, pseudo:string}} actor - l'admin qui fait l'action, pour le journal
 */
export async function setPlayerMessage(uid, message, actor = null) {
  await updateDoc(doc(db, 'users', uid), { message: message || null });

  if (actor) {
    const targetSnap = await getDoc(doc(db, 'users', uid));
    const targetPseudo = targetSnap.exists() ? targetSnap.data().pseudo : uid;
    const description = message
      ? `Message pour ${targetPseudo} : « ${message} »`
      : `Message de ${targetPseudo} supprimé`;
    await logAdminAction(actor, 'message', description);
  }
}
