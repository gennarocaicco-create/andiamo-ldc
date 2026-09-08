// src/services/communityPicks.js
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/**
 * Pour chaque match déjà verrouillé (en cours, à moins de 30 min du coup
 * d'envoi, ou terminé), regroupe les pronostics des joueurs par score
 * exact annoncé — pour le récap "pronostics de la communauté" sur l'Accueil.
 * Ne renvoie jamais rien pour un match pas encore verrouillé, afin de ne
 * jamais dévoiler un pronostic à venir.
 *
 * @param {Map<string, {pseudo:string}>} playersById - uid -> joueur
 */
export async function fetchCommunityPicks(playersById) {
  const [matchesSnap, predictionsSnap] = await Promise.all([
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'predictions')),
  ]);

  const now = Date.now();
  const lockedMatches = matchesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => {
      const locksAt = m.locksAt?.toDate ? m.locksAt.toDate().getTime() : null;
      return locksAt !== null && now >= locksAt;
    });

  const predictionsByMatch = new Map();
  predictionsSnap.forEach((d) => {
    const p = d.data();
    const list = predictionsByMatch.get(p.matchId) || [];
    list.push(p);
    predictionsByMatch.set(p.matchId, list);
  });

  return lockedMatches
    .map((match) => {
      const predictions = predictionsByMatch.get(match.id) || [];
      if (predictions.length === 0) return null;

      const groups = new Map(); // "2-1" -> [pseudo, pseudo, ...]
      predictions.forEach((p) => {
        const key = `${p.predictedScore.home}-${p.predictedScore.away}`;
        const pseudo = playersById.get(p.uid)?.pseudo || '???';
        const list = groups.get(key) || [];
        list.push(pseudo);
        groups.set(key, list);
      });

      const scoreGroups = Array.from(groups.entries())
        .map(([score, pseudos]) => ({ score, pseudos }))
        .sort((a, b) => b.pseudos.length - a.pseudos.length);

      return {
        matchId: match.id,
        homeClub: match.homeClub,
        awayClub: match.awayClub,
        kickoffAt: match.kickoffAt,
        scoreGroups,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.kickoffAt?.toDate ? a.kickoffAt.toDate().getTime() : 0;
      const bTime = b.kickoffAt?.toDate ? b.kickoffAt.toDate().getTime() : 0;
      return bTime - aTime;
    });
}
