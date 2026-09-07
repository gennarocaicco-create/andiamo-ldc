// scripts/seed.mjs
// Remplit Firestore avec les 36 clubs de la Ligue des Champions 2026-2027
// et les 18 matchs de la Journée 1 (8-10 septembre 2026).
//
// Usage (depuis la racine du projet, avec ton fichier .env déjà rempli) :
//   node --env-file=.env scripts/seed.mjs TON_PSEUDO TON_MOT_DE_PASSE
//
// ⚠️ Ton compte doit déjà avoir le rôle "owner" ou "admin" dans Firestore
// (collection users, champ "role") — sinon les règles de sécurité vont
// refuser l'écriture. Voir les instructions données dans le chat.

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const [, , pseudoArg, passwordArg] = process.argv;

if (!pseudoArg || !passwordArg) {
  console.error('Usage: node --env-file=.env scripts/seed.mjs TON_PSEUDO TON_MOT_DE_PASSE');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Les 36 clubs de la phase de ligue 2026-2027
// ---------------------------------------------------------------------------
const CLUBS = [
  'AEK Athens', 'LASK', 'Club Brugge', 'Aston Villa', 'Borussia Dortmund',
  'Villarreal', 'Porto', 'Manchester City', 'Lille', 'Real Betis',
  'Real Madrid', 'Inter Milan', 'FC Barcelona', 'Feyenoord', 'Stuttgart',
  'Viking', 'Liverpool', 'Atlético Madrid', 'Paris Saint-Germain',
  'Slovan Bratislava', 'Sporting CP', 'Galatasaray', 'Napoli', 'Arsenal',
  'Fenerbahçe', 'AS Roma', 'PSV Eindhoven', 'Shakhtar Donetsk', 'Como',
  'RB Leipzig', 'Bayern Munich', 'Bodø/Glimt', 'Manchester United', 'Sabah',
  'Slavia Praha', 'RC Lens',
];

// ---------------------------------------------------------------------------
// Journée 1 — 8, 9 et 10 septembre 2026 (heures UTC ; 18h45/21h00 heure de Paris)
// ---------------------------------------------------------------------------
const MATCHDAY_1 = [
  { home: 'AEK Athens', away: 'LASK', kickoffUTC: '2026-09-08T16:45:00Z' },
  { home: 'Club Brugge', away: 'Aston Villa', kickoffUTC: '2026-09-08T16:45:00Z' },
  { home: 'Borussia Dortmund', away: 'Villarreal', kickoffUTC: '2026-09-08T19:00:00Z' },
  { home: 'Porto', away: 'Manchester City', kickoffUTC: '2026-09-08T19:00:00Z' },
  { home: 'Lille', away: 'Real Betis', kickoffUTC: '2026-09-08T19:00:00Z' },
  { home: 'Real Madrid', away: 'Inter Milan', kickoffUTC: '2026-09-08T19:00:00Z' },
  { home: 'FC Barcelona', away: 'Feyenoord', kickoffUTC: '2026-09-09T16:45:00Z' },
  { home: 'Stuttgart', away: 'Viking', kickoffUTC: '2026-09-09T16:45:00Z' },
  { home: 'Liverpool', away: 'Atlético Madrid', kickoffUTC: '2026-09-09T19:00:00Z' },
  { home: 'Paris Saint-Germain', away: 'Slovan Bratislava', kickoffUTC: '2026-09-09T19:00:00Z' },
  { home: 'Sporting CP', away: 'Galatasaray', kickoffUTC: '2026-09-09T19:00:00Z' },
  { home: 'Napoli', away: 'Arsenal', kickoffUTC: '2026-09-09T19:00:00Z' },
  { home: 'Fenerbahçe', away: 'AS Roma', kickoffUTC: '2026-09-10T16:45:00Z' },
  { home: 'PSV Eindhoven', away: 'Shakhtar Donetsk', kickoffUTC: '2026-09-10T16:45:00Z' },
  { home: 'Como', away: 'RB Leipzig', kickoffUTC: '2026-09-10T19:00:00Z' },
  { home: 'Bayern Munich', away: 'Bodø/Glimt', kickoffUTC: '2026-09-10T19:00:00Z' },
  { home: 'Manchester United', away: 'Sabah', kickoffUTC: '2026-09-10T19:00:00Z' },
  { home: 'Slavia Praha', away: 'RC Lens', kickoffUTC: '2026-09-10T19:00:00Z' },
];

async function seed() {
  const email = `${pseudoArg.trim().toLowerCase()}@andiamo-ldc.local`;
  console.log(`Connexion en tant que ${pseudoArg}...`);
  await signInWithEmailAndPassword(auth, email, passwordArg);
  console.log('Connecté.');

  console.log(`Écriture de ${CLUBS.length} clubs...`);
  for (const name of CLUBS) {
    const clubId = slugify(name);
    await setDoc(doc(db, 'clubs', clubId), {
      name,
      points: 0,
      played: 0,
      form: [],
    });
  }
  console.log('Clubs écrits.');

  console.log(`Écriture de ${MATCHDAY_1.length} matchs (Journée 1)...`);
  for (const m of MATCHDAY_1) {
    const kickoffAt = new Date(m.kickoffUTC);
    const locksAt = new Date(kickoffAt.getTime() - 30 * 60 * 1000);
    // ID stable "home-vs-away" : dans le nouveau format suisse, deux clubs ne
    // se rencontrent qu'une seule fois pendant la phase de ligue, donc cet
    // identifiant est unique pour toute la saison. La synchro automatique
    // (Cloud Functions) utilise exactement le même schéma pour retrouver et
    // mettre à jour ce même document plutôt que d'en créer un doublon.
    const matchId = `${slugify(m.home)}-vs-${slugify(m.away)}`;

    await setDoc(doc(db, 'matches', matchId), {
      matchday: 1,
      homeClub: m.home,
      awayClub: m.away,
      kickoffAt: Timestamp.fromDate(kickoffAt),
      locksAt: Timestamp.fromDate(locksAt),
      status: 'scheduled',
      score: null,
    });
  }
  console.log('Matchs écrits.');

  console.log('\n✅ Terminé ! Clubs et Journée 1 sont dans Firestore.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erreur pendant le seed :', err.message);
  process.exit(1);
});
