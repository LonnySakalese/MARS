# Système d'Auras Avatar — Design Spec
**Date** : 2026-03-31
**Statut** : Approuvé

---

## Objectif

Remplacer la sélection d'emoji basique par un système d'avatar gamifié : chaque compte possède un avatar unique grâce à une **aura animée** déblocable via les rangs et les badges existants.

---

## Architecture

### Nouveau module : `src/ui/avatar.js`

Point d'entrée unique pour tout ce qui touche à l'avatar. Aucune logique d'aura ne doit exister ailleurs.

**Exports :**

```js
AURAS                  // catalogue complet (tableau d'objets)
getUnlockedAuras(profile, unlockedBadges, rankName)  // → string[] des IDs débloqués
getActiveAura(profile)    // → objet aura actif ou null
setActiveAura(auraId)     // sauvegarde profile.activeAura + sync Firestore
renderAvatar(opts)        // → HTML string (avatar complet avec aura)
renderAuraPicker(opts)    // → HTML string (picker pour le profil)
```

**Dépendances :**
- Lit le profil via `storage.js` (`getData`, `saveData`)
- Vérifie les badges via `loadBadges()` dans `badges.js`
- Vérifie le rang via `getRank()` dans `ranks.js`
- Pas de dépendance circulaire

### Nouveau fichier CSS : `src/ui/avatar.css`

Toutes les animations et classes d'auras sont isolées dans ce fichier. Aucune modification du CSS existant.

---

## Stockage

Un seul champ ajouté au profil existant :

```js
profile.activeAura = "feu"  // ID de l'aura active, null si aucune
```

- Synchro Firestore via le mécanisme existant dans `syncProfileToFirestore()`
- Pas de nouveau champ Firestore, pas de nouvelle collection
- Les auras débloquées ne sont **pas stockées** — elles sont calculées dynamiquement à partir des badges et du rang

---

## Catalogue des auras

### Auras de rang (débloquées automatiquement)

| ID | Nom | Rang requis | Style visuel |
|---|---|---|---|
| `acier` | Acier | Débutant | Halo simple, lent, discret |
| `azur` | Azur | Apprenti | Double anneau qui respire |
| `braise` | Braise | Confirmé | Anneau pointillé tournant + glow |
| `doree` | Dorée | Expert | Triple ring en cascade pulsant |
| `sacree` | Sacrée | Maître | Multi-ring + rotation dorée + glow max |

### Auras spéciales (débloquées par badges)

| ID | Nom | Condition de débloquage | Couleur |
|---|---|---|---|
| `flammes` | Flammes | Badge Victoires Or+ | `#FF6B35` |
| `blizzard` | Blizzard | Badge Régularité Or+ | `#00D4FF` |
| `foudre` | Foudre | Badge Perfection Or+ | `#FFFF00` |
| `ombre` | Ombre | Badge Noctambule Or+ | `#8B5CF6` |
| `verdure` | Verdure | Badge Architecte Or+ | `#39FF14` |
| `celeste` | Céleste | Badge Collectionneur Diamant | `#B9F2FF` |
| `prestige` | Prestige | Badge Prestige Diamant | `#FF00FF` |

---

## Rendu de l'avatar

### Fonction `renderAvatar(opts)`

```js
renderAvatar({
  emoji,       // string — l'emoji sélectionné (ex: "🐺")
  aura,        // objet aura ou null
  size,        // "large" (profil) | "small" (chat)
  rankName,    // string — pour déterminer le style chat du Maître
})
```

Retourne un HTML string avec :
- Un conteneur positionné relatif
- L'emoji centré
- Les anneaux CSS de l'aura appliqués autour

### Rendu profil (`size: "large"`)

Aura en **pleine intensité** avec toutes les animations actives.

### Rendu chat (`size: "small"`)

- **Tous les rangs** : bordure colorée + glow statique léger (`box-shadow` fixe, opacité réduite)
- **Maître uniquement** : + un anneau pointillé en rotation lente (animation `spin 6s linear infinite`)
- Pas d'animation pulse dans le chat pour éviter la surcharge visuelle

---

## UI — Page Profil

### Déclencheur

Le bouton ✎ existant sur l'avatar ouvre le picker d'aura **à la place** (ou en plus) du picker d'emoji.

### Picker d'aura

Structure HTML générée par `renderAuraPicker()` :

```
[Titre : ✦ CHANGER L'AURA]

[Section : Auras de rang débloquées]
  → grille d'auras cliquables avec nom + animation

[Section : Auras spéciales]
  → auras débloquées cliquables
  → auras verrouillées : grisées (grayscale 100%, opacity 0.35) + icône 🔒
     + tooltip/sous-texte indiquant la condition de débloquage

[Bouton : Fermer]
```

L'aura active est mise en évidence avec `outline: 3px solid #fff`.

---

## UI — Chat groupe

Impacte `src/ui/chat.js` : le rendu des messages groupe appelle `renderAvatar()` avec `size: "small"` à la place de l'emoji brut actuel.

---

## Modifications de fichiers existants

| Fichier | Modification |
|---|---|
| `src/ui/avatar.js` | **Créer** — module complet |
| `src/ui/avatar.css` | **Créer** — animations et classes |
| `src/pages/profile.js` | Intégrer `renderAuraPicker()` + `setActiveAura()` dans `openAvatarPicker()` |
| `src/ui/chat.js` | Remplacer l'emoji brut par `renderAvatar({ size: "small" })` dans le rendu des messages |
| `index.html` | Ajouter `<link rel="stylesheet" href="src/ui/avatar.css">` |
| `src/app.js` | Exposer `window.setActiveAura` si appelé depuis le HTML |

---

## Ce qui ne change PAS

- La sélection d'emoji reste inchangée — l'aura s'y superpose
- La structure Firestore n'est pas modifiée (sauf le champ `activeAura` dans `profile`)
- Le système de badges et de rangs existant n't est pas touché
- Le service worker / cache PWA : incrémenter `CACHE_NAME` dans `sw.js` au déploiement

---

## Critères de succès

- Un utilisateur peut ouvrir le picker, voir ses auras débloquées vs verrouillées, en sélectionner une
- L'aura sélectionnée s'affiche immédiatement sur le profil et persiste après rechargement
- L'aura apparaît dans le chat en version discrète sans surcharger l'interface
- Un nouvel utilisateur (rang Débutant, aucun badge) voit l'aura "Acier" disponible par défaut
- Les auras se débloquent automatiquement quand le rang ou les badges progressent
