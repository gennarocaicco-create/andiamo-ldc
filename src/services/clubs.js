import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/** Classement des clubs, triés par points décroissants. */
export async function fetchClubStandings() {
  const q = query(collection(db, 'clubs'), orderBy('points', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Juste les noms des 36 clubs, triés alphabétiquement (pour le sélecteur de bonus). */
export async function fetchClubNames() {
  const snap = await getDocs(collection(db, 'clubs'));
  return snap.docs.map((d) => d.data().name).sort((a, b) => a.localeCompare(b, 'fr'));
}
