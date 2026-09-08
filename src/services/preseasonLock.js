// src/services/preseasonLock.js
// Gère le verrouillage des pronostics bonus d'avant-saison (Top 8,
// Vainqueur, Finaliste, Meilleur buteur). Le document settings/preseasonLock
// existe seulement quand c'est verrouillé — sa simple présence bloque
// l'écriture côté joueurs (voir firestore.rules).

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/** true si les bonus avant-saison sont actuellement verrouillés. */
export async function fetchPreseasonLockStatus() {
  const snap = await getDoc(doc(db, 'settings', 'preseasonLock'));
  return snap.exists();
}

/** Verrouille immédiatement le Top 8, le Vainqueur, le Finaliste et le Meilleur buteur. */
export async function lockPreseasonBonuses() {
  await setDoc(doc(db, 'settings', 'preseasonLock'), { locksAt: serverTimestamp() });
}

/** Rouvre la saisie des bonus avant-saison. */
export async function unlockPreseasonBonuses() {
  await deleteDoc(doc(db, 'settings', 'preseasonLock'));
}
