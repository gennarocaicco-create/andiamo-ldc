import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

export async function fetchRegistrationStatus() {
  const snap = await getDoc(doc(db, 'settings', 'registration'));
  return snap.exists() ? snap.data().isOpen : true; // ouvert par défaut
}

export async function setRegistrationStatus(isOpen) {
  await setDoc(doc(db, 'settings', 'registration'), { isOpen }, { merge: true });
}
