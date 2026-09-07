import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/** Récupère tous les matchs, triés par date de coup d'envoi. */
export async function fetchAllMatches() {
  const q = query(collection(db, 'matches'), orderBy('kickoffAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Récupère un match précis. */
export async function fetchMatch(matchId) {
  const snap = await getDoc(doc(db, 'matches', matchId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Récupère le pronostic d'un joueur pour un match donné, s'il existe. */
export async function fetchMyPrediction(matchId, uid) {
  const predictionId = `${matchId}_${uid}`;
  const snap = await getDoc(doc(db, 'predictions', predictionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Enregistre (ou met à jour) le pronostic d'un joueur pour un match.
 * Les règles Firestore refusent l'écriture si le match est déjà verrouillé.
 */
export async function submitPrediction(matchId, uid, predictedScore) {
  const predictionId = `${matchId}_${uid}`;
  await setDoc(
    doc(db, 'predictions', predictionId),
    {
      matchId,
      uid,
      predictedScore,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
