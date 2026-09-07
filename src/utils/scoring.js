/**
 * Andiamo-LDC — Logique de scoring
 * ---------------------------------
 * Ce module est indépendant de Firebase et de React : il prend des objets
 * de données simples en entrée et renvoie des nombres/objets simples.
 * Ça le rend facile à tester et à réutiliser (front, cloud functions, etc.).
 *
 * Convention: un "résultat" (result) vaut 'H' (home gagne), 'A' (away gagne)
 * ou 'D' (nul), déduit d'un score {home, away}.
 */

// ---------------------------------------------------------------------------
// 1. Points d'un match individuel
// ---------------------------------------------------------------------------

/** Déduit le résultat ('H' | 'A' | 'D') à partir d'un score {home, away}. */
export function resultFromScore(score) {
  if (score.home > score.away) return 'H';
  if (score.home < score.away) return 'A';
  return 'D';
}

/**
 * Calcule les points d'un pronostic sur un match déjà joué.
 * - Score exact           → 2 pts
 * - Bon résultat (pas exact) → 1 pt
 * - Sinon                  → 0 pt
 *
 * @param {{home:number, away:number}} predicted
 * @param {{home:number, away:number}} actual
 * @param {boolean} [voided] - true si le match a été reporté/annulé
 * @returns {{points:number, exact:boolean, correctResult:boolean}}
 */
export function scoreMatchPrediction(predicted, actual, voided = false) {
  if (voided) {
    // Règle : match reporté/annulé → pronostic annulé, aucun point, ni +ni-.
    return { points: 0, exact: false, correctResult: false };
  }

  const exact = predicted.home === actual.home && predicted.away === actual.away;
  if (exact) {
    return { points: 2, exact: true, correctResult: true };
  }

  const correctResult = resultFromScore(predicted) === resultFromScore(actual);
  return { points: correctResult ? 1 : 0, exact: false, correctResult };
}

// ---------------------------------------------------------------------------
// 2. Bonus "journée parfaite" (sur les 18 matchs d'une journée)
// ---------------------------------------------------------------------------

const MATCHDAY_SIZE = 18;

const MATCHDAY_TIERS = [
  { min: 18, bonus: 3 },
  { min: 15, bonus: 2 },
  { min: 12, bonus: 1 },
];

/**
 * Bonus de journée en fonction du nombre de bons résultats (score exact
 * compte aussi comme "bon résultat" ici) sur les 18 matchs de la journée.
 * Les paliers ne se cumulent pas : seul le palier le plus haut atteint compte.
 *
 * @param {number} correctResultsCount - nombre de bons résultats (0 à 18)
 * @returns {number} bonus (0, 1, 2 ou 3)
 */
export function matchdayBonus(correctResultsCount) {
  if (correctResultsCount > MATCHDAY_SIZE) {
    throw new Error(`correctResultsCount ne peut pas dépasser ${MATCHDAY_SIZE}`);
  }
  const tier = MATCHDAY_TIERS.find((t) => correctResultsCount >= t.min);
  return tier ? tier.bonus : 0;
}

// ---------------------------------------------------------------------------
// 3. Bonus avant-saison : Top 8, Vainqueur, Finaliste, Meilleur buteur
// ---------------------------------------------------------------------------

const TOP8_POINTS_PER_CLUB = 1;
const TOP8_RANK_BONUS = 1; // +1 pt supplémentaire si le rang exact est bon
export const WINNER_BONUS_POINTS = 12;
export const FINALIST_BONUS_POINTS = 10;
export const TOP_SCORER_BONUS_POINTS = 10;

/**
 * Calcule les points du bonus Top 8.
 * @param {string[]} predictedTop8 - 8 clubs prédits, dans l'ordre (rang 1 à 8)
 * @param {string[]} actualTop8 - 8 clubs réellement qualifiés, dans l'ordre
 * @returns {{points:number, clubsCorrect:number, ranksCorrect:number}}
 */
export function top8BonusScore(predictedTop8, actualTop8) {
  if (predictedTop8.length !== 8 || actualTop8.length !== 8) {
    throw new Error('Le Top 8 doit contenir exactement 8 clubs');
  }

  let clubsCorrect = 0;
  let ranksCorrect = 0;

  predictedTop8.forEach((club, index) => {
    if (actualTop8.includes(club)) {
      clubsCorrect += 1;
      if (actualTop8[index] === club) {
        ranksCorrect += 1;
      }
    }
  });

  const points = clubsCorrect * TOP8_POINTS_PER_CLUB + ranksCorrect * TOP8_RANK_BONUS;
  return { points, clubsCorrect, ranksCorrect };
}

/** @returns {number} WINNER_BONUS_POINTS si bon, sinon 0 */
export function winnerBonusScore(predictedWinner, actualWinner) {
  return predictedWinner === actualWinner ? WINNER_BONUS_POINTS : 0;
}

/** @returns {number} FINALIST_BONUS_POINTS si bon, sinon 0 */
export function finalistBonusScore(predictedFinalist, actualFinalists) {
  return actualFinalists.includes(predictedFinalist) ? FINALIST_BONUS_POINTS : 0;
}

/** @returns {number} TOP_SCORER_BONUS_POINTS si bon, sinon 0 */
export function topScorerBonusScore(predictedScorer, actualTopScorer) {
  return predictedScorer === actualTopScorer ? TOP_SCORER_BONUS_POINTS : 0;
}

// ---------------------------------------------------------------------------
// 4. Bonus confrontation directe (barrages, 8es, quarts, demies)
// ---------------------------------------------------------------------------

export const KNOCKOUT_QUALIFIER_BONUS_POINTS = 2;

/**
 * @param {string} predictedQualifier - club choisi comme qualifié avant la double confrontation
 * @param {string|null} actualQualifier - club réellement qualifié (null si pas encore joué)
 * @returns {number}
 */
export function knockoutQualifierBonusScore(predictedQualifier, actualQualifier) {
  if (!actualQualifier) return 0; // confrontation pas encore terminée
  return predictedQualifier === actualQualifier ? KNOCKOUT_QUALIFIER_BONUS_POINTS : 0;
}

/**
 * Total de points d'une confrontation à élimination directe :
 * bonus qualifié + points des deux matchs aller-retour.
 *
 * @param {object} params
 * @param {number} params.qualifierBonusPoints
 * @param {{points:number}} params.legHome - résultat du match aller (scoreMatchPrediction)
 * @param {{points:number}} params.legAway - résultat du match retour (scoreMatchPrediction)
 * @returns {number}
 */
export function knockoutTieTotalScore({ qualifierBonusPoints, legHome, legAway }) {
  return qualifierBonusPoints + legHome.points + legAway.points;
}

// ---------------------------------------------------------------------------
// 5. Score total d'un joueur sur la saison
// ---------------------------------------------------------------------------

/**
 * Agrège tous les points d'un joueur pour produire son total de saison.
 * Chaque paramètre est optionnel : on peut appeler cette fonction à
 * n'importe quel moment de la saison avec seulement ce qui est déjà connu.
 *
 * @param {object} input
 * @param {Array<{points:number}>} [input.matchResults] - un scoreMatchPrediction() par match joué
 * @param {number[]} [input.matchdayBonuses] - un matchdayBonus() par journée terminée
 * @param {number} [input.top8Points]
 * @param {number} [input.winnerPoints]
 * @param {number} [input.finalistPoints]
 * @param {number} [input.topScorerPoints]
 * @param {number[]} [input.knockoutTiePoints] - un knockoutTieTotalScore() par confrontation
 * @returns {number} total de points
 */
export function computeSeasonTotal({
  matchResults = [],
  matchdayBonuses = [],
  top8Points = 0,
  winnerPoints = 0,
  finalistPoints = 0,
  topScorerPoints = 0,
  knockoutTiePoints = [],
} = {}) {
  const sum = (arr) => arr.reduce((acc, n) => acc + n, 0);

  return (
    sum(matchResults.map((r) => r.points)) +
    sum(matchdayBonuses) +
    top8Points +
    winnerPoints +
    finalistPoints +
    topScorerPoints +
    sum(knockoutTiePoints)
  );
}

// ---------------------------------------------------------------------------
// 6. Classement et départage
// ---------------------------------------------------------------------------

/**
 * Valeur de départage d'un joueur : nombre de scores exacts + nombre de
 * bons résultats (score exact inclus), additionnés en un seul chiffre.
 * Plus c'est haut, mieux c'est classé en cas d'égalité de points.
 *
 * @param {Array<{exact:boolean, correctResult:boolean}>} matchResults
 * @returns {number}
 */
export function tieBreakValue(matchResults) {
  const exactCount = matchResults.filter((r) => r.exact).length;
  const correctResultCount = matchResults.filter((r) => r.correctResult).length;
  return exactCount + correctResultCount;
}

/**
 * Trie une liste de joueurs par points décroissants, puis par valeur de
 * départage décroissante en cas d'égalité.
 *
 * @param {Array<{id:string, points:number, tieBreak:number}>} players
 * @returns {Array} nouvelle liste triée (ne mute pas l'entrée)
 */
export function rankPlayers(players) {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.tieBreak - a.tieBreak;
  });
}
