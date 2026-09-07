// src/services/adminScores.js
// Utilisé par l'écran Admin → Scores. Pas de Cloud Function : tout se
// passe ici, côté client, protégé par les règles Firestore (isAdmin()).

import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { scoreMatchPrediction } from '../utils/scoring.js';

/**
 * Un admin saisit (ou corrige) le score d'un match, et les points de
 * tous les pronostics liés à ce match sont recalculés dans la foulée.
 *
 * @param {string} matchId
 * @param {{home:number, away:number}} score
 * @param {'finished'|'postponed'|'cancelled'} status
 */
export async function submitMatchScore(matchId, score, status = 'finished') {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, { score, status });

  const voided = status === 'postponed' || status === 'cancelled';

  const predictionsQuery = query(collection(db, 'predictions'), where('matchId', '==', matchId));
  const predictionsSnap = await getDocs(predictionsQuery);

  const batch = writeBatch(db);
  predictionsSnap.forEach((predictionDoc) => {
    const prediction = predictionDoc.data();
    const result = voided
      ? { points: 0, exact: false, correctResult: false }
      : scoreMatchPrediction(prediction.predictedScore, score, false);

    batch.update(predictionDoc.ref, {
      points: result.points,
      exact: result.exact,
      correctResult: result.correctResult,
    });
  });

  await batch.commit();

  return { predictionsUpdated: predictionsSnap.size };
}
