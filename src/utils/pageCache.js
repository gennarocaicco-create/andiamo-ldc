// src/utils/pageCache.js
// Cache mémoire très simple, partagé entre toutes les pages tant que
// l'onglet du navigateur reste ouvert (perdu au rechargement complet).
// Sert à afficher instantanément les dernières données connues d'un écran
// quand on y revient, pendant qu'une actualisation silencieuse se fait
// derrière — évite un "Chargement..." à chaque va-et-vient entre les
// onglets de l'appli.

const cache = new Map();

export function getPageCache(key) {
  return cache.has(key) ? cache.get(key) : null;
}

export function setPageCache(key, value) {
  cache.set(key, value);
}
