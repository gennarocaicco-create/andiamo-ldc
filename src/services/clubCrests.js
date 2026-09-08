// src/services/clubCrests.js
// Récupère l'écusson officiel d'un club via TheSportsDB (API gratuite,
// clé publique de démo "123" fournie par TheSportsDB pour un usage léger).
// En cas d'échec (club introuvable, API indisponible), on renvoie null et
// l'interface affiche un simple rond à la place — jamais d'erreur bloquante.

const cache = new Map();

export async function getClubCrestUrl(clubName) {
  if (cache.has(clubName)) return cache.get(clubName);

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(clubName)}`
    );
    if (!res.ok) throw new Error('Réponse non OK');
    const data = await res.json();
    const badge = data?.teams?.[0]?.strBadge || null;
    cache.set(clubName, badge);
    return badge;
  } catch {
    cache.set(clubName, null);
    return null;
  }
}
