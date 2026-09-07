import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/** Récupère les pronostics bonus d'avant-saison d'un joueur. */
export async function fetchMyBonusPicks(uid) {
  const snap = await getDoc(doc(db, 'seasonBonusPicks', uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Enregistre les pronostics bonus d'un joueur (Top 8, vainqueur, finaliste,
 * buteur). Les règles Firestore refusent l'écriture une fois verrouillé.
 */
export async function saveMyBonusPicks(uid, picks) {
  await setDoc(
    doc(db, 'seasonBonusPicks', uid),
    { uid, ...picks, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Les vraies réponses, saisies par l'admin une fois connues. */
export async function fetchBonusResults() {
  const snap = await getDoc(doc(db, 'seasonBonusResults', 'current'));
  return snap.exists() ? snap.data() : null;
}

/** Admin : saisit ou met à jour les résultats réels des bonus. */
export async function saveBonusResults(results) {
  await setDoc(doc(db, 'seasonBonusResults', 'current'), results, { merge: true });
}
