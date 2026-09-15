// src/services/bonusLocks.js
// Verrouillage indépendant de chaque bonus avant-saison (Top 8, Vainqueur,
// Finaliste, Meilleur buteur) — un seul document Firestore avec un champ
// booléen par catégorie, pour que l'admin puisse gérer chacune séparément.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

export const BONUS_CATEGORIES = ['top8', 'winner', 'finalist', 'topScorer'];

/** @returns {{top8:boolean, winner:boolean, finalist:boolean, topScorer:boolean}} */
export async function fetchBonusLocks() {
  const snap = await getDoc(doc(db, 'settings', 'bonusLocks'));
  const data = snap.exists() ? snap.data() : {};
  return {
    top8: !!data.top8,
    winner: !!data.winner,
    finalist: !!data.finalist,
    topScorer: !!data.topScorer,
  };
}

/** Verrouille ou déverrouille une seule catégorie de bonus. */
export async function setBonusLock(category, locked) {
  await setDoc(doc(db, 'settings', 'bonusLocks'), { [category]: locked }, { merge: true });
}
