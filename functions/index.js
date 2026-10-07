import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import { fetchFixturesByDate, fetchSeasonFixtures, normalizeFixture, slugify } from './lib/apiFootball.js';
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
    const res = await upsertFixtures(fixtures);
    console.log(`Sync du jour (${today}) : ${res.written} mis à jour, ${res.skipped} ignoré(s).`);
  }
);

/**
 * Écrit (ou met à jour) des matchs dans Firestore à partir de fixtures
 * API-Football. Ne touche pas aux matchs corrigés à la main (manualOverride),
 * ignore les tours à élimination directe (pas de journée), et n'écrit que
 * ce qui a réellement changé. Si l'horaire change (match décalé), le
 * verrouillage (30 min avant) est recalculé. Crée aussi les clubs manquants.
 */
async function upsertFixtures(fixtures) {
  const existingSnap = await db.collection('matches').get();
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data()]));
  const clubsSnap = await db.collection('clubs').get();
  const knownClubs = new Set(clubsSnap.docs.map((d) => d.id));

  let batch = db.batch();
  let ops = 0;
  let written = 0;
  let skipped = 0;

  for (const fixture of fixtures) {
    const n = normalizeFixture(fixture);
    if (n.matchday == null) { skipped += 1; continue; }

    const prev = existing.get(n.matchId);
    if (prev?.manualOverride) { skipped += 1; continue; }

    const kickoffAt = new Date(n.kickoffTime);
    const sameKickoff = prev?.kickoffAt?.toMillis?.() === kickoffAt.getTime();
    const sameScore =
      (prev?.score?.home ?? null) === (n.score?.home ?? null) &&
      (prev?.score?.away ?? null) === (n.score?.away ?? null);

    const unchanged =
      prev &&
      prev.status === n.status &&
      prev.matchday === n.matchday &&
      prev.homeClub === n.homeTeam &&
      prev.awayClub === n.awayTeam &&
      sameKickoff &&
      sameScore;
    if (unchanged) { skipped += 1; continue; }

    const data = {
      matchday: n.matchday,
      homeClub: n.homeTeam,
      awayClub: n.awayTeam,
      status: n.status,
      score: n.score,
      kickoffAt,
      syncedAt: FieldValue.serverTimestamp(),
    };
    if (!prev || !sameKickoff || !prev.locksAt) {
      data.locksAt = new Date(kickoffAt.getTime() - 30 * 60 * 1000);
    }
    if (!prev) data.manualOverride = false;

    batch.set(db.collection('matches').doc(n.matchId), data, { merge: true });
    ops += 1;
    written += 1;

    for (const name of [n.homeTeam, n.awayTeam]) {
      const clubId = slugify(name);
      if (!knownClubs.has(clubId)) {
        knownClubs.add(clubId);
        batch.set(db.collection('clubs').doc(clubId), { name, points: 0, played: 0, form: [] });
        ops += 1;
      }
    }

    if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
  }
  if (ops > 0) await batch.commit();
  return { written, skipped };
}

/**
 * Calendrier complet : toutes les journées de la phase de ligue.
 * Toutes les 3 heures : ajoute les nouveaux matchs, détecte les reports,
 * annulations et changements d'horaire. (1 requête API par exécution.)
 */
export const syncSchedule = onSchedule(
  {
    schedule: 'every 3 hours',
    secrets: [API_FOOTBALL_KEY],
    timeZone: 'Europe/Brussels',
  },
  async () => {
    const fixtures = await fetchSeasonFixtures(API_FOOTBALL_KEY.value());
    const res = await upsertFixtures(fixtures);
    console.log(`Calendrier : ${fixtures.length} match(s) reçus, ${res.written} écrits, ${res.skipped} inchangés/ignorés.`);
  }
);

/**
 * Même chose, mais à la demande : bouton « Charger le calendrier » dans
 * Admin → Calendrier (réservé aux admins).
 */
export const importSchedule = onCall(
  { region: 'europe-west1', secrets: [API_FOOTBALL_KEY] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Connexion requise.');
    const callerSnap = await db.collection('users').doc(request.auth.uid).get();
    const role = callerSnap.data()?.role;
    if (role !== 'admin' && role !== 'owner') {
      throw new HttpsError('permission-denied', 'Réservé aux admins.');
    }
    const fixtures = await fetchSeasonFixtures(API_FOOTBALL_KEY.value());
    const res = await upsertFixtures(fixtures);
    return { received: fixtures.length, written: res.written, skipped: res.skipped };
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
