# Spec : Système d'avatars personnages (Reddit-style)

**Date :** 2026-04-01
**Statut :** Approuvé

---

## Contexte

L'application MARS utilise actuellement des emojis comme avatars, entourés d'auras animées (système implémenté le 2026-03-31). L'objectif est de remplacer les emojis par de vrais personnages cartoon 2D — une tête illustrée avec des couches personnalisables (peau, yeux, coiffure, accessoires, expression) — tout en conservant le système d'auras existant.

Architecture pensée pour une future migration React Native : les données SVG (paths) sont pures constantes JS, la logique de rendu est isolée dans une fonction remplaçable.

---

## 1. Structure des données

Le champ `profile.avatar` (string emoji) est remplacé par `profile.avatarConfig` (objet) :

```js
{
  skinTone:   'medium',   // ID teinte de peau
  eyeStyle:   'round',    // ID forme des yeux
  hairStyle:  'short',    // ID coiffure
  hairColor:  'brown',    // ID couleur cheveux
  accessory:  'none',     // ID accessoire
  expression: 'smile',    // ID expression
}
```

**Valeurs par défaut** appliquées si `avatarConfig` est absent (migration transparente).

Chaque option dans le catalogue est un objet :
```js
{
  id: string,
  label: string,
  unlockCondition: null | { type: 'rank', rankIndex: number } | { type: 'badge', id: string }
}
```

---

## 2. Architecture des fichiers

```
src/ui/
├── character-parts.js   — catalogue pur (données + SVG paths, aucune logique)
├── character.js         — logique : renderCharacter(), picker, unlock, save
├── character.css        — styles SVG + picker UI
└── avatar.js            — MODIFIÉ : renderAvatar() appelle renderCharacter()
```

### `character-parts.js`
Uniquement des constantes exportées. Aucune logique. Fichier extensible dans le temps.

```js
export const SKIN_TONES = [
  { id: 'light',      label: 'Claire',       hex: '#FDDBB4', unlockCondition: null },
  { id: 'medium_light', label: 'Médium clair', hex: '#E8B88A', unlockCondition: null },
  { id: 'medium',     label: 'Médium',       hex: '#C68642', unlockCondition: null },
  { id: 'medium_dark', label: 'Médium foncé', hex: '#8D5524', unlockCondition: null },
  { id: 'dark',       label: 'Foncé',        hex: '#4A2912', unlockCondition: null },
  { id: 'very_dark',  label: 'Très foncé',   hex: '#2D1B0E', unlockCondition: null },
];

export const EYE_STYLES = [...];   // 7 options (voir catalogue)
export const HAIR_STYLES = [...];  // 8 options
export const HAIR_COLORS = [...];  // 7 options
export const ACCESSORIES = [...];  // 7 options
export const EXPRESSIONS = [...];  // 6 options
```

Chaque option de coiffure / yeux / accessoire / expression contient un champ `path` avec le SVG path string correspondant.

### `character.js`
- `getDefaultAvatarConfig()` — retourne la config par défaut
- `getAvatarConfig()` — lit `profile.avatarConfig` depuis localStorage, applique les defaults si absent
- `saveAvatarConfig(config)` — persiste en localStorage + Firestore (`merge: true`)
- `getUnlockedOptions(category)` — retourne les IDs débloqués pour une catégorie
- `renderCharacter({ config, size })` — assemble et retourne un SVG inline string
- `openCharacterPicker()` — injecte et affiche la modale picker
- `closeCharacterPicker()` — ferme la modale

### `character.css`
Styles pour le SVG inline (tailles, transitions) et l'interface du picker (onglets, grille, états locked/active).

### `avatar.js` (modification)
Dans `renderAvatar()`, remplacer :
```js
<span class="avatar-emoji">${resolvedEmoji}</span>
```
par :
```js
${renderCharacter({ config: getAvatarConfig(), size })}
```

---

## 3. Catalogue complet

### Peau (6 options — toutes débloquées)
| ID | Label |
|----|-------|
| light | Claire |
| medium_light | Médium clair |
| medium | Médium |
| medium_dark | Médium foncé |
| dark | Foncé |
| very_dark | Très foncé |

### Yeux (7 options)
| ID | Label | Condition |
|----|-------|-----------|
| round | Rond | — |
| almond | Amande | — |
| small | Petit | — |
| vivid | Vif | badge streak_t2 |
| determined | Déterminé | rang Braise (2) |
| legendary | Légendaire | rang Doré (3) |
| sleepy | Endormi | badge nightowl_t3 |

### Coiffure (8 options)
| ID | Label | Condition |
|----|-------|-----------|
| short | Court | — |
| medium | Mi-long | — |
| bun | Chignon | — |
| braid | Tresse | — |
| afro | Afro | badge victories_t3 |
| mohawk | Mohawk | rang Braise (2) |
| long | Longue | badge habits_t3 |
| crown_hair | Avec couronne | rang Doré (3) |

### Couleur cheveux (7 options)
| ID | Label | Condition |
|----|-------|-----------|
| black | Noir | — |
| brown | Brun | — |
| blonde | Blond | — |
| red | Roux | — |
| white | Blanc | rang Sacré (4) |
| blue | Bleu | badge streak_t3 |
| pink | Rose | badge collector_t5 |

### Accessoires (7 options)
| ID | Label | Condition |
|----|-------|-----------|
| none | Aucun | — |
| glasses | Lunettes rondes | — |
| helmet | Casque | rang Azur (1) |
| headband | Bandeau | badge perfect_t2 |
| scar | Cicatrice | badge victories_t2 |
| hat | Chapeau | rang Braise (2) |
| crown | Couronne | rang Doré (3) |

### Expression (6 options)
| ID | Label | Condition |
|----|-------|-----------|
| smile | Sourire | — |
| neutral | Neutre | — |
| determined | Déterminé | — |
| smirk | Sourire malin | rang Azur (1) |
| intense | Intense | badge streak_t3 |
| legendary | Légendaire | rang Sacré (4) |

---

## 4. Interface picker

```
┌─────────────────────────────────┐
│  [Aperçu live du personnage]    │  ← SVG 96px, mis à jour en temps réel
├─────────────────────────────────┤
│ Peau | Yeux | Cheveux | +  | + │  ← onglets scrollables
├─────────────────────────────────┤
│  [●] [●] [●]  [🔒] [🔒] [🔒]  │  ← grille d'options
│  Claire  Médium  Foncé          │
└─────────────────────────────────┘
```

- **Aperçu live** : personnage 96px en haut, mis à jour instantanément à chaque sélection, avec l'aura active si présente
- **Onglets** : Peau / Yeux / Cheveux / Couleur / Accessoires / Expression — scrollables horizontalement sur mobile
- **Options verrouillées** : grisées avec 🔒 + texte indiquant la condition (ex : "Rang Braise requis")
- **Option active** : bordure colorée + checkmark
- Accès via bouton "Changer l'avatar" sur la page profil (remplace le bouton emoji actuel)

---

## 5. Intégration aura + migration

**Aura** : `renderAvatar()` dans `avatar.js` reste le point d'entrée unique. L'appel à `renderCharacter()` remplace uniquement le `<span class="avatar-emoji">`. Les anneaux d'aura CSS ne changent pas.

**Migration** : comptes existants avec `profile.avatar` (emoji) mais sans `profile.avatarConfig` reçoivent silencieusement les valeurs par défaut au premier rendu. Aucune action utilisateur requise.

**Firestore** : `saveAvatarConfig()` utilise `set({ profile: { avatarConfig } }, { merge: true })` — même pattern que `setActiveAura()`. Le champ `profile.avatar` n'est plus écrit.

**Chat** : `renderAvatar()` en `size: 'small'` affiche le personnage en 44px dans les bulles. Le champ `senderAura` dans les messages existants continue de fonctionner sans modification.

---

## 6. Compatibilité React Native

- `character-parts.js` : constantes JS pures (paths SVG, couleurs hex) — 100% réutilisables
- `getAvatarConfig()`, `saveAvatarConfig()`, `getUnlockedOptions()` : logique pure — 100% réutilisable
- `renderCharacter()` : seule fonction à réécrire, en composants `react-native-svg`
- Les paths SVG écrits pour le web sont directement compatibles avec `react-native-svg`
