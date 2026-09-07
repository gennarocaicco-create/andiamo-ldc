// src/services/auth.js
// Connexion par pseudo + mot de passe. Firebase Auth n'accepte que des
// emails, donc on génère un email technique invisible à partir du pseudo :
// "Elena_92" → "elena_92@andiamo-ldc.local"

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';

const PSEUDO_DOMAIN = 'andiamo-ldc.local';

function pseudoToEmail(pseudo) {
  return `${pseudo.trim().toLowerCase()}@${PSEUDO_DOMAIN}`;
}

/**
 * Vérifie qu'un pseudo n'est pas déjà pris (Firestore, pas Firebase Auth
 * directement, pour pouvoir afficher un message clair avant de tenter
 * la création de compte).
 */
export async function isPseudoTaken(pseudo) {
  const snap = await getDoc(doc(db, 'pseudos', pseudo.trim().toLowerCase()));
  return snap.exists();
}

/**
 * Crée un compte joueur. Vérifie d'abord que les inscriptions sont
 * ouvertes (settings/registration.isOpen) et que le pseudo est libre.
 *
 * @param {string} pseudo
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function signUp(pseudo, password) {
  const registrationSnap = await getDoc(doc(db, 'settings', 'registration'));
  if (registrationSnap.exists() && registrationSnap.data().isOpen === false) {
    throw new Error('Les inscriptions sont actuellement fermées.');
  }

  if (await isPseudoTaken(pseudo)) {
    throw new Error('Ce pseudo est déjà pris.');
  }

  const email = pseudoToEmail(pseudo);
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // Réserve le pseudo (empêche un doublon créé en même temps par quelqu'un d'autre).
  await setDoc(doc(db, 'pseudos', pseudo.trim().toLowerCase()), {
    uid: credential.user.uid,
  });

  // Crée le profil joueur.
  await setDoc(doc(db, 'users', credential.user.uid), {
    pseudo: pseudo.trim(),
    role: 'player',
    createdAt: serverTimestamp(),
    message: null,
  });

  return credential;
}

/**
 * Connecte un joueur avec son pseudo + mot de passe.
 * @param {string} pseudo
 * @param {string} password
 */
export function signIn(pseudo, password) {
  const email = pseudoToEmail(pseudo);
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOut() {
  return firebaseSignOut(auth);
}
