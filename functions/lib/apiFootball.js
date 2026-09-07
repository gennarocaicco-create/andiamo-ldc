/**
 * Petit client pour l'API-Football, en appelant directement l'API-Sports
 * (pas via RapidAPI) : compte créé sur dashboard.api-football.com.
 * Doc: https://www.api-football.com/documentation-v3
 *
 * La clé API est lue depuis une variable d'environnement Firebase
 * (voir README.md : firebase functions:secrets:set API_FOOTBALL_KEY).
 */

const API_FOOTBALL_HOST = 'v3.football.api-sports.io';
const CHAMPIONS_LEAGUE_ID = 2; // ID de la Ligue des Champions dans API-Football
const CURRENT_SEASON = 2026; // saison 2026-2027

/**
 * Récupère les matchs de la Ligue des Champions pour une date donnée.
 * @param {string} apiKey - ta clé "My Access" du dashboard api-football.com
 * @param {string} date - format YYYY-MM-DD
 * @returns {Promise<Array>} liste brute de fixtures API-Football
 */
export async function fetchFixturesByDate(apiKey, date) {
  const url = new URL(`https://${API_FOOTBALL_HOST}/fixtures`);
  url.searchParams.set('league', CHAMPIONS_LEAGUE_ID);
  url.searchParams.set('season', CURRENT_SEASON);
  url.searchParams.set('date', date);

  const response = await fetch(url, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football a répondu ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.response; // tableau de fixtures
}

/**
 * Transforme un nom de club en identifiant stable (mêmes règles que le
 * script de seed) : minuscules, sans accents, tirets à la place des espaces.
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Transforme une fixture brute API-Football en format Firestore simplifié,
 * cohérent avec ce qu'attend scoring.js.
 *
 * L'identifiant du match ("matchId") est calculé à partir des noms des deux
 * clubs ("home-vs-away"), PAS de l'ID interne API-Football. Dans le format
 * suisse de la phase de ligue, deux clubs ne se rencontrent qu'une seule
 * fois dans la saison, donc cet identifiant est stable et unique — et c'est
 * exactement le même schéma que celui utilisé par scripts/seed.mjs, pour
 * que la synchro automatique mette à jour les bons documents au lieu d'en
 * créer des doublons.
 *
 * @param {object} fixture
 * @returns {{
 *   matchId: string,
 *   status: 'scheduled'|'live'|'finished'|'postponed'|'cancelled',
 *   homeTeam: string,
 *   awayTeam: string,
 *   score: {home:number, away:number}|null,
 *   kickoffTime: string
 * }}
 */
export function normalizeFixture(fixture) {
  const statusMap = {
    NS: 'scheduled', // Not Started
    '1H': 'live',
    HT: 'live',
    '2H': 'live',
    ET: 'live',
    P: 'live',
    FT: 'finished',
    AET: 'finished',
    PEN: 'finished',
    PST: 'postponed',
    CANC: 'cancelled',
    ABD: 'cancelled',
  };

  const shortStatus = fixture.fixture.status.short;
  const homeTeam = fixture.teams.home.name;
  const awayTeam = fixture.teams.away.name;

  return {
    matchId: `${slugify(homeTeam)}-vs-${slugify(awayTeam)}`,
    status: statusMap[shortStatus] || 'scheduled',
    homeTeam,
    awayTeam,
    score:
      fixture.goals.home !== null && fixture.goals.away !== null
        ? { home: fixture.goals.home, away: fixture.goals.away }
        : null,
    kickoffTime: fixture.fixture.date,
  };
}
