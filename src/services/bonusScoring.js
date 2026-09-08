// src/services/bonusScoring.js
// Calcule le détail des points "bonus" d'un joueur : bonus "journée
// parfaite" par journée entièrement terminée, et bonus avant-saison une
// fois les vrais résultats connus (saisis par un admin dans
// seasonBonusResults/current). Tant qu'un résultat n'est pas encore connu,
// la catégorie correspondante est marquée "pending" plutôt que comptée à 0.

import {
  matchdayBonus,
  top8BonusScore,
  winnerBonusScore,
  finalistBonusScore,
  topScorerBonusScore,
} from '../utils/scoring.js';

/**
 * @param {object} params
 * @param {Array} params.matches - tous les matchs (avec matchday, status, id)
 * @param {Array} params.predictions - pronostics bruts du joueur (matchId, exact, correctResult)
 * @param {object|null} params.bonusPicks - pronostics avant-saison du joueur (top8, winner, finalist, topScorer)
 * @param {object|null} params.bonusResults - vrais résultats avant-saison, une fois connus (top8, winner, finalists, topScorer)
 * @returns {{total:number, breakdown: Array<{key:string,label:string,status:'pending'|'scored',points?:number,detail?:string}>}}
 */
export function computeBonusBreakdown({ matches, predictions, bonusPicks, bonusResults }) {
  const breakdown = [];
  let total = 0;

  // --- Bonus "journée parfaite" (par journée entièrement terminée) ---
  const matchdays = new Map();
  matches.forEach((m) => {
    if (m.matchday == null) return;
    const list = matchdays.get(m.matchday) || [];
    list.push(m);
    matchdays.set(m.matchday, list);
  });

  const predictionByMatchId = new Map(predictions.map((p) => [p.matchId, p]));

  Array.from(matchdays.keys())
    .sort((a, b) => a - b)
    .forEach((md) => {
      const mdMatches = matchdays.get(md);
      const allFinished = mdMatches.every((m) => m.status === 'finished');

      if (!allFinished) {
        breakdown.push({ key: `md${md}`, label: `Journée ${md} (parfaite)`, status: 'pending' });
        return;
      }

      const correctCount = mdMatches.filter((m) => {
        const p = predictionByMatchId.get(m.id);
        return p && (p.exact || p.correctResult);
      }).length;
      const bonus = matchdayBonus(correctCount);
      total += bonus;
      breakdown.push({
        key: `md${md}`,
        label: `Journée ${md} (parfaite)`,
        status: 'scored',
        points: bonus,
        detail: `${correctCount}/${mdMatches.length} bons résultats`,
      });
    });

  // --- Bonus avant-saison ---
  const seasonEntries = [
    {
      key: 'top8',
      label: 'Top 8',
      ready: bonusPicks?.top8?.length === 8 && bonusResults?.top8?.length === 8,
      compute: () => {
        const { points, clubsCorrect, ranksCorrect } = top8BonusScore(bonusPicks.top8, bonusResults.top8);
        return { points, detail: `${clubsCorrect} clubs corrects, ${ranksCorrect} bien placés` };
      },
    },
    {
      key: 'winner',
      label: 'Vainqueur',
      ready: !!bonusPicks?.winner && !!bonusResults?.winner,
      compute: () => ({ points: winnerBonusScore(bonusPicks.winner, bonusResults.winner) }),
    },
    {
      key: 'finalist',
      label: 'Finaliste',
      ready: !!bonusPicks?.finalist && Array.isArray(bonusResults?.finalists),
      compute: () => ({ points: finalistBonusScore(bonusPicks.finalist, bonusResults.finalists) }),
    },
    {
      key: 'topScorer',
      label: 'Meilleur buteur',
      ready: !!bonusPicks?.topScorer && !!bonusResults?.topScorer,
      compute: () => ({ points: topScorerBonusScore(bonusPicks.topScorer, bonusResults.topScorer) }),
    },
  ];

  seasonEntries.forEach((entry) => {
    if (!entry.ready) {
      breakdown.push({ key: entry.key, label: entry.label, status: 'pending' });
      return;
    }
    const { points, detail } = entry.compute();
    total += points;
    breakdown.push({ key: entry.key, label: entry.label, status: 'scored', points, detail });
  });

  return { total, breakdown };
}
