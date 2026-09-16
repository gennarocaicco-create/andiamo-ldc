// src/services/clubCrests.js
// Récupère l'écusson officiel d'un club via TheSportsDB (API gratuite,
// clé publique de démo "123" fournie par TheSportsDB pour un usage léger).
// En cas d'échec (club introuvable, API indisponible), on renvoie null et
// l'interface affiche un simple rond à la place — jamais d'erreur bloquante.

// TheSportsDB utilise parfois un nom différent du nôtre pour le même club.
// Cette table de correspondance permet de corriger ces cas au fur et à
// mesure qu'on les découvre, sans toucher au nom affiché dans l'appli.
const NAME_ALIASES = {
  'Paris Saint-Germain': 'Paris SG',
};

const cache = new Map();

export async function getClubCrestUrl(clubName) {
  if (cache.has(clubName)) return cache.get(clubName);

  const searchName = NAME_ALIASES[clubName] || clubName;

  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(searchName)}`
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
