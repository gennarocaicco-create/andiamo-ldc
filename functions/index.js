import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { fetchFixturesByDate, normalizeFixture } from './lib/apiFootball.js';
import { scoreMatchPrediction } from './lib/scoring.js';

initializeApp();
const db = getFirestore();

const API_FOOTBALL_KEY = defineSecret('API_FOOTBALL_KEY');

// ---------------------------------------------------------------------------
// 1. Synchronisation automatique des scores (planifiée)
// ---------------------------------------------------------------------------

/**
 * Tourne toutes les 10 minutes. Interroge API-Football pour la date du jour,
 * et met à jour Firestore — SAUF les matchs qu'un admin a corrigés à la main
 * (manualOverride: true), pour ne jamais écraser une correction humaine.
 */
export const syncMatchScores = onSchedule(
  {
    schedule: 'every 10 minutes',
    secrets: [API_FOOTBALL_KEY],
    timeZone: 'Europe/Brussels',
  },
  async () => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const fixtures = await fetchFixturesByDate(API_FOOTBALL_KEY.value(), today);

    if (fixtures.length === 0) {
      console.log(`Aucun match ce jour (${today}).`);
      return;
    }

    const batch = db.batch();
    let updatedCount = 0;

    for (const fixture of fixtures) {
      const normalized = normalizeFixture(fixture);
      const matchRef = db.collection('matches').doc(normalized.matchId);
      const existingSnap = await matchRef.get();
      const existing = existingSnap.data();

      // Un admin a corrigé ce match à la main → on ne touche plus à rien
      // automatiquement pour ce match.
      if (existing?.manualOverride) {
        continue;
      }

      const kickoffAt = new Date(normalized.kickoffTime);
      const locksAt = new Date(kickoffAt.getTime() - 30 * 60 * 1000);

      batch.set(
        matchRef,
        {
          homeClub: normalized.homeTeam,
          awayClub: normalized.awayTeam,
          status: normalized.status,
          score: normalized.score,
          kickoffAt,
          // Ne réécrit locksAt que s'il n'existe pas déjà (le seed.mjs l'a
          // déjà calculé) — évite de le recalculer à chaque synchro.
          ...(existing?.locksAt ? {} : { locksAt }),
          syncedAt: FieldValue.serverTimestamp(),
          manualOverride: false,
        },
        { merge: true }
      );
      updatedCount += 1;
    }

    await batch.commit();
    console.log(`Sync terminée : ${updatedCount} match(s) mis à jour pour le ${today}.`);
  }
);

// ---------------------------------------------------------------------------
// 2. Correction manuelle par un admin (callable depuis l'app)
// ---------------------------------------------------------------------------

/**
 * Permet à un admin de corriger un score à la main depuis l'écran
 * Admin → Scores. Marque le match comme "manualOverride" pour que la
 * synchronisation automatique ne l'écrase plus jamais.
 *
 * Appel côté app : httpsCallable(functions, 'setManualMatchScore')({ matchId, home, away })
 */
export const setManualMatchScore = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'Connexion requise.');
  }

  const callerSnap = await db.collection('users').doc(auth.uid).get();
  const callerRole = callerSnap.data()?.role;
  if (callerRole !== 'admin' && callerRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Réservé aux admins.');
  }

  const { matchId, home, away, status = 'finished' } = data;
  if (typeof matchId !== 'string' || typeof home !== 'number' || typeof away !== 'number') {
    throw new HttpsError('invalid-argument', 'matchId, home et away sont requis.');
  }

  await db.collection('matches').doc(matchId).set(
    {
      score: { home, away },
      status,
      manualOverride: true, // protège ce match des futures synchros automatiques
      correctedBy: auth.uid,
      correctedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true };
});

/**
 * Permet à un admin de redonner un match à la synchronisation automatique
 * (annule le verrou manualOverride), au cas où la correction manuelle
 * n'était plus nécessaire.
 */
export const clearManualOverride = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Connexion requise.');

  const callerSnap = await db.collection('users').doc(auth.uid).get();
  const callerRole = callerSnap.data()?.role;
  if (callerRole !== 'admin' && callerRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Réservé aux admins.');
  }

  await db.collection('matches').doc(data.matchId).set({ manualOverride: false }, { merge: true });
  return { success: true };
});

// ---------------------------------------------------------------------------
// 3. Recalcul automatique des points quand un match passe à "finished"
// ---------------------------------------------------------------------------

/**
 * Se déclenche à chaque écriture sur un match (sync auto OU correction
 * manuelle — les deux passent par le même document Firestore). Si le match
 * vient de passer à "finished" avec un score, recalcule les points de
 * tous les joueurs qui avaient pronostiqué ce match.
 */
export const recomputePointsOnMatchFinished = onDocumentUpdated('matches/{matchId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  const justFinished = before.status !== 'finished' && after.status === 'finished';
  const justVoided = ['postponed', 'cancelled'].includes(after.status) && before.status !== after.status;

  if (!justFinished && !justVoided) return;

  const matchId = event.params.matchId;
  const predictionsSnap = await db.collection('predictions').where('matchId', '==', matchId).get();

  const batch = db.batch();
  predictionsSnap.forEach((doc) => {
    const prediction = doc.data();
    const voided = justVoided;
    const result = voided
      ? { points: 0, exact: false, correctResult: false }
      : scoreMatchPrediction(prediction.predictedScore, after.score, false);

    batch.update(doc.ref, {
      points: result.points,
      exact: result.exact,
      correctResult: result.correctResult,
      scoredAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Points recalculés pour ${predictionsSnap.size} pronostic(s) sur le match ${matchId}.`);
});
