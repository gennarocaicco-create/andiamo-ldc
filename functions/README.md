# Synchronisation automatique des scores — Andiamo-LDC

Ce dossier `functions/` contient les Cloud Functions Firebase qui :
1. Récupèrent automatiquement les scores de la Ligue des Champions toutes les
   10 minutes depuis **API-Football**.
2. Recalculent les points des pronostics dès qu'un match passe "terminé".
3. Laissent un admin corriger un score à la main si l'API se trompe —
   et protègent cette correction contre un écrasement automatique.

## 1. Créer un compte API-Football

1. Va sur https://dashboard.api-football.com/register (site officiel, pas RapidAPI)
2. Inscris-toi (email/mot de passe ou "Sign Up with Google"), valide ton compte via le mail reçu
3. Une fois connecté : **Account → My Access** dans le menu de gauche, copie la clé API
4. Le plan gratuit donne 100 requêtes/jour, sans carte bancaire — largement suffisant
   puisqu'on ne fait qu'un appel toutes les 10 min les jours de match

## 2. Configurer la clé dans Firebase

```bash
firebase functions:secrets:set API_FOOTBALL_KEY
# Colle ta clé quand c'est demandé
```

## 3. Installer et déployer

```bash
cd functions
npm install
firebase deploy --only functions
```

## 4. Vérifier que ça tourne

```bash
firebase functions:log
```

Tu devrais voir un message toutes les 10 minutes du type :
`Sync terminée : 3 match(s) mis à jour pour le 2026-11-25.`

## Comment la correction manuelle s'articule avec la synchro auto

- Tant qu'un match n'a pas été corrigé à la main, la synchro auto écrit
  dessus normalement toutes les 10 min.
- Dès qu'un admin corrige un score dans **Admin → Scores** (appel de
  `setManualMatchScore`), le match reçoit `manualOverride: true`.
- La prochaine synchro auto **ignore ce match** — donc pas de risque que
  l'API revienne écraser la correction avec une donnée fausse.
- Si besoin, `clearManualOverride` redonne la main à la synchro auto pour
  ce match précis.

## Points d'attention avant la mise en prod

- `CURRENT_SEASON` dans `lib/apiFootball.js` est codé en dur sur 2025 —
  à mettre à jour chaque nouvelle saison.
- Le mapping des statuts API-Football → statuts internes est dans
  `normalizeFixture()` ; si l'API ajoute un nouveau code de statut non
  prévu, la fonction retombera sur `'scheduled'` par défaut (à surveiller
  dans les logs).
- Le matching entre l'ID de match Firestore et l'ID API-Football se fait
  actuellement par l'ID externe API-Football lui-même comme ID de document
  Firestore — plus simple, mais à adapter si tu préfères générer tes propres
  IDs de match.
