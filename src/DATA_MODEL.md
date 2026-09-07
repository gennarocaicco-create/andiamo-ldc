# Modèle de données Firestore — Andiamo-LDC

Version "essentiel" : tout est écrit/lu directement depuis l'app (pas de
Cloud Functions). Les points sont calculés côté client avec `scoring.js`
au moment où l'admin saisit un score, puis écrits dans Firestore.

## Collections

### `users/{uid}`
Un document par joueur inscrit.
```js
{
  pseudo: "Elena_92",
  email: "elena_92@andiamo-ldc.local", // email technique généré depuis le pseudo
  role: "player" | "admin" | "owner",
  createdAt: Timestamp,
  message: "En tête depuis 3 journées !" | null, // mot d'encouragement admin
}
```

### `clubs/{clubId}`
Un document par club de la compétition (36 pour la phase de ligue).
```js
{
  name: "Real Madrid",
  crestUrl: "https://...", // vient d'une API football, ajouté plus tard
  points: 19,      // classement phase de ligue, mis à jour par l'admin
  played: 6,
  form: ["w","w","w","d","w"], // 5 derniers résultats
}
```

### `matches/{matchId}`
Un document par match de la phase de ligue.
```js
{
  matchday: 6,
  homeClub: "Inter Milan",
  awayClub: "Arsenal",
  kickoffAt: Timestamp,
  status: "scheduled" | "finished" | "postponed" | "cancelled",
  score: { home: 2, away: 1 } | null,
  locksAt: Timestamp, // = kickoffAt - 30 minutes, calculé à la création
}
```

### `predictions/{matchId}_{uid}`
Un pronostic = un match + un joueur. L'ID composite évite les doublons.
```js
{
  matchId: "abc123",
  uid: "user_xyz",
  predictedScore: { home: 2, away: 0 },
  points: 1,          // rempli après le calcul (scoreMatchPrediction)
  exact: false,
  correctResult: true,
  createdAt: Timestamp,
  lockedAt: Timestamp, // copie de matches.locksAt, pour affichage simple
}
```

### `seasonBonusPicks/{uid}`
Un document par joueur pour ses pronostics d'avant-saison (verrouillés
30 min avant le 1er match de la compétition).
```js
{
  uid: "user_xyz",
  top8: ["Real Madrid", "Man City", ...], // 8 clubs, dans l'ordre
  winner: "Real Madrid",
  finalist: "Man City",
  topScorer: "Erling Haaland",
  lockedAt: Timestamp,
}
```

### `seasonBonusResults/current` (document unique)
Les vraies réponses, saisies par l'admin une fois connues.
```js
{
  actualTop8: ["Real Madrid", "Bayern", ...] | null,
  actualWinner: "Real Madrid" | null,
  actualFinalists: ["Real Madrid", "Man City"] | null,
  actualTopScorer: "Erling Haaland" | null,
}
```

### `settings/registration` (document unique)
```js
{
  isOpen: true,
}
```

## Comment les points se calculent (V1, sans Cloud Functions)

1. L'admin ouvre **Admin → Scores**, saisit le score d'un match terminé.
2. L'app lit toutes les `predictions` liées à ce `matchId`.
3. Pour chacune, elle appelle `scoreMatchPrediction()` (déjà écrit dans
   `scoring.js`) et met à jour `points`, `exact`, `correctResult`.
4. Le classement (`rankPlayers()`) se recalcule à l'affichage, à partir
   de la somme des points de chaque joueur — pas besoin de stocker un
   "total" séparé pour l'instant, tant que le nombre de joueurs reste
   petit (50-100).

⚠️ Cette V1 fait confiance aux admins pour saisir les bons scores — la
protection "manualOverride" et le recalcul automatique via Cloud
Functions (déjà écrits dans `functions/`) restent disponibles pour plus
tard, quand tu voudras la synchro automatique.
