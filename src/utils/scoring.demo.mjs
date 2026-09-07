// Petit script de vérification manuelle — pas un vrai framework de test,
// juste pour confirmer que la logique correspond aux exemples des maquettes.
// Lancer avec : node src/utils/scoring.demo.mjs

import {
  scoreMatchPrediction,
  matchdayBonus,
  top8BonusScore,
  winnerBonusScore,
  finalistBonusScore,
  topScorerBonusScore,
  knockoutQualifierBonusScore,
  knockoutTieTotalScore,
  computeSeasonTotal,
  tieBreakValue,
  rankPlayers,
} from './scoring.js';

function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? '✅' : '❌'} ${label}`, pass ? '' : `→ attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`);
}

// --- Match individuel (exemples de l'écran Pronostic / Bracket) ---
check(
  'Score exact (3-1 prédit, 3-1 réel) = 2 pts',
  scoreMatchPrediction({ home: 3, away: 1 }, { home: 3, away: 1 }).points,
  2
);
check(
  'Bon résultat sans score exact (2-0 prédit, 3-0 réel) = 1 pt',
  scoreMatchPrediction({ home: 2, away: 0 }, { home: 3, away: 0 }).points,
  1
);
check(
  'Mauvais pronostic (1-1 prédit, 0-2 réel) = 0 pt',
  scoreMatchPrediction({ home: 1, away: 1 }, { home: 0, away: 2 }).points,
  0
);
check(
  'Match annulé = 0 pt même si le score existe',
  scoreMatchPrediction({ home: 2, away: 1 }, { home: 2, away: 1 }, true).points,
  0
);

// --- Bonus journée parfaite (18 matchs/journée) ---
check('12 bons résultats → +1', matchdayBonus(12), 1);
check('14 bons résultats → +1', matchdayBonus(14), 1);
check('15 bons résultats → +2', matchdayBonus(15), 2);
check('17 bons résultats → +2', matchdayBonus(17), 2);
check('18 bons résultats → +3', matchdayBonus(18), 3);
check('11 bons résultats → +0', matchdayBonus(11), 0);

// --- Bonus Top 8 ---
const predictedTop8 = ['Real Madrid', 'Man City', 'Bayern', 'PSG', 'Arsenal', 'Inter', 'Barcelone', 'Liverpool'];
const actualTop8 = ['Real Madrid', 'Bayern', 'Man City', 'PSG', 'Inter', 'Arsenal', 'Liverpool', 'Dortmund'];
// Real Madrid: club ok + rang ok (2pts) | Man City: club ok, rang faux (1pt)
// Bayern: club ok, rang faux (1pt) | PSG: club ok + rang ok (2pts)
// Arsenal: club ok, rang faux (1pt) | Inter: club ok, rang faux (1pt)
// Barcelone: absent (0pt) | Liverpool: club ok, rang faux (1pt)
// Total attendu: 2+1+1+2+1+1+0+1 = 9
check('Top 8 mixte → 9 pts', top8BonusScore(predictedTop8, actualTop8).points, 9);

const perfectTop8 = ['Real Madrid', 'Man City', 'Bayern', 'PSG', 'Arsenal', 'Inter', 'Barcelone', 'Liverpool'];
check('Top 8 parfait (8 clubs + 8 rangs) → 16 pts', top8BonusScore(perfectTop8, perfectTop8).points, 16);

// --- Bonus vainqueur / finaliste / buteur ---
check('Vainqueur correct → 12 pts', winnerBonusScore('Real Madrid', 'Real Madrid'), 12);
check('Vainqueur faux → 0 pt', winnerBonusScore('Real Madrid', 'Man City'), 0);
check('Finaliste correct → 10 pts', finalistBonusScore('Man City', ['Real Madrid', 'Man City']), 10);
check('Buteur correct → 10 pts', topScorerBonusScore('Erling Haaland', 'Erling Haaland'), 10);

// --- Confrontation directe (bracket) ---
check('Qualifié correct → 2 pts', knockoutQualifierBonusScore('Bayern', 'Bayern'), 2);
check('Qualifié faux → 0 pt', knockoutQualifierBonusScore('Bayern', 'Juventus'), 0);
check('Confrontation pas encore jouée → 0 pt', knockoutQualifierBonusScore('Bayern', null), 0);

// Reprend l'exemple du bracket : Bayern qualifié (+2), aller 3-1 prédit 3-1 (+1 dans l'exemple visuel, en vrai 2 si exact — ici on suit l'exemple UI: aller +1, retour +2)
const legAller = { points: 1 };
const legRetour = { points: 2 };
check(
  'Total confrontation (bracket) = 2 (qualifié) + 1 (aller) + 2 (retour) = 5',
  knockoutTieTotalScore({ qualifierBonusPoints: 2, legHome: legAller, legAway: legRetour }),
  5
);

// --- Départage ---
const matchResultsExample = [
  { exact: true, correctResult: true },
  { exact: false, correctResult: true },
  { exact: false, correctResult: false },
  { exact: true, correctResult: true },
];
// 2 scores exacts + 3 bons résultats (l'exact compte aussi comme bon résultat) = 5
check('Valeur de départage = 5', tieBreakValue(matchResultsExample), 5);

// --- Classement avec départage ---
const players = [
  { id: 'elena', points: 61, tieBreak: 20 },
  { id: 'gennaro', points: 61, tieBreak: 24 },
  { id: 'tifoso', points: 55, tieBreak: 30 },
];
check(
  'Classement: égalité 61 pts départagée par tieBreak → Gennaro devant Elena',
  rankPlayers(players).map((p) => p.id),
  ['gennaro', 'elena', 'tifoso']
);

// --- Total de saison ---
const seasonTotal = computeSeasonTotal({
  matchResults: [{ points: 2 }, { points: 1 }, { points: 0 }],
  matchdayBonuses: [1, 2],
  top8Points: 9,
  winnerPoints: 12,
  finalistPoints: 0,
  topScorerPoints: 10,
  knockoutTiePoints: [5, 2],
});
// 2+1+0=3 | +1+2=3 (bonus journées) | +9 +12 +0 +10 | +5+2=7 → total 3+3+9+12+0+10+7 = 44
check('Total de saison agrégé = 44', seasonTotal, 44);

console.log('\nVérification terminée.');
