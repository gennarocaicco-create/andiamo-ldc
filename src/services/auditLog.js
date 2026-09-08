// src/services/auditLog.js
// Journal des actions des admins, visible uniquement par le "owner".

import { addDoc, collection, getDocs, orderBy, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/**
 * Enregistre une action d'admin dans le journal.
 * @param {{uid:string, pseudo:string}} actor - l'admin qui fait l'action
 * @param {string} action - court identifiant, ex: "score", "role", "message"
 * @param {string} description - phrase lisible, ex: "PSG 2-1 Barça"
 */
export async function logAdminAction(actor, action, description) {
  await addDoc(collection(db, 'auditLog'), {
    actorUid: actor.uid,
    actorPseudo: actor.pseudo,
    action,
    description,
    createdAt: serverTimestamp(),
  });
}

/** Les 100 dernières actions, les plus récentes en premier. */
export async function fetchAuditLog() {
  const q = query(collection(db, 'auditLog'), orderBy('createdAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
