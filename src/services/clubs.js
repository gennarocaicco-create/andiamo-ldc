import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

/**
 * Classement des clubs, calculé à partir des résultats réels des matchs
 * terminés (3 pts victoire, 1 pt nul, 0 pt défaite — comme en vraie Ligue
 * des Champions), avec la différence de buts comme critère de départage.
 * Rien n'est stocké : recalculé à chaque appel à partir des matchs.
 */
export async function fetchClubStandings() {
  const [clubsSnap, matchesSnap] = await Promise.all([
    getDocs(collection(db, 'clubs')),
    getDocs(collection(db, 'matches')),
  ]);

  const statsByName = new Map();
  clubsSnap.forEach((d) => {
    const name = d.data().name;
    statsByName.set(name, {
      id: d.id,
      name,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      form: [],
    });
  });

  const finishedMatches = matchesSnap.docs
    .map((d) => d.data())
    .filter((m) => m.status === 'finished' && m.score)
    .sort((a, b) => {
      const aTime = a.kickoffAt?.toDate ? a.kickoffAt.toDate().getTime() : 0;
      const bTime = b.kickoffAt?.toDate ? b.kickoffAt.toDate().getTime() : 0;
      return aTime - bTime; // ordre chronologique, pour que la "forme" soit dans le bon sens
    });

  finishedMatches.forEach((m) => {
    const home = statsByName.get(m.homeClub);
    const away = statsByName.get(m.awayClub);
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.score.home;
    home.goalsAgainst += m.score.away;
    away.goalsFor += m.score.away;
    away.goalsAgainst += m.score.home;

    if (m.score.home > m.score.away) {
      home.points += 3; home.won += 1; home.form.push('V');
      away.lost += 1; away.form.push('D');
    } else if (m.score.home < m.score.away) {
      away.points += 3; away.won += 1; away.form.push('V');
      home.lost += 1; home.form.push('D');
    } else {
      home.points += 1; home.drawn += 1; home.form.push('N');
      away.points += 1; away.drawn += 1; away.form.push('N');
    }
  });

  const clubs = Array.from(statsByName.values()).map((c) => ({
    ...c,
    goalDiff: c.goalsFor - c.goalsAgainst,
    form: c.form.slice(-5), // 5 derniers résultats
  }));

  clubs.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name, 'fr')
  );

  return clubs;
}

/** Juste les noms des 36 clubs, triés alphabétiquement (pour le sélecteur de bonus). */
export async function fetchClubNames() {
  const snap = await getDocs(collection(db, 'clubs'));
  return snap.docs.map((d) => d.data().name).sort((a, b) => a.localeCompare(b, 'fr'));
}
