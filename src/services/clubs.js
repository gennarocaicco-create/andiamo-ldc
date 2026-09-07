import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/** Classement des clubs, triés par points décroissants. */
export async function fetchClubStandings() {
  const q = query(collection(db, 'clubs'), orderBy('points', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
