# Character Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace emoji avatars with layered SVG cartoon character heads (skin, eyes, hair, accessories, expression) customizable per user, with aura system preserved.

**Architecture:** Pure SVG catalog in `character-parts.js`, rendering + picker logic in `character.js`, `renderAvatar()` in `avatar.js` delegates to `renderCharacter()`. Profile saves `profile.avatarConfig` to localStorage + Firestore (merge). Chat messages store `senderAvatarConfig` alongside `senderAura`.

**Tech Stack:** Vanilla JS ES6 modules, inline SVG (viewBox 0 0 100 100), localStorage + Firestore merge writes. No bundler.

---

### Task 1: Create `src/ui/character-parts.js` — SVG catalog

**Files:**
- Create: `src/ui/character-parts.js`

This file is pure data — no imports, no logic. Every array entry has `id`, `label`, `unlockCondition` (null = available immediately, `{ type: 'rank', rankIndex: N }` or `{ type: 'badge', id: 'badge_id' }`). Hair styles use `svgBack`/`svgFront` (rendered behind/in-front of the head ellipse); both can be null. Eyes, expressions, accessories use `svg` (full SVG element strings). Skin and hair color use `hex`.

Character renders in a `viewBox="0 0 100 100"`. Head is `<ellipse cx="50" cy="58" rx="30" ry="35"/>`. Hair uses `{COLOR}` placeholder replaced at render time.

- [ ] **Step 1: Create the file**

```js
// ============================================================
// CHARACTER PARTS — Catalogue SVG (données pures, aucune logique)
// ============================================================

// ---- Teintes de peau ----
export const SKIN_TONES = [
    { id: 'light',        label: 'Claire',        hex: '#FDDBB4', unlockCondition: null },
    { id: 'medium_light', label: 'Médium clair',  hex: '#E8B88A', unlockCondition: null },
    { id: 'medium',       label: 'Médium',        hex: '#C68642', unlockCondition: null },
    { id: 'medium_dark',  label: 'Médium foncé',  hex: '#8D5524', unlockCondition: null },
    { id: 'dark',         label: 'Foncé',         hex: '#4A2912', unlockCondition: null },
    { id: 'very_dark',    label: 'Très foncé',    hex: '#2D1B0E', unlockCondition: null },
];

// ---- Styles d'yeux ----
// svg = éléments SVG complets positionnés dans viewBox 0 0 100 100
// Yeux centrés autour de (38,52) gauche et (62,52) droite
export const EYE_STYLES = [
    {
        id: 'round', label: 'Rond', unlockCondition: null,
        svg: '<circle cx="38" cy="52" r="4" fill="#2C2C2C"/><circle cx="62" cy="52" r="4" fill="#2C2C2C"/><circle cx="39.5" cy="50.5" r="1.5" fill="white"/><circle cx="63.5" cy="50.5" r="1.5" fill="white"/>',
    },
    {
        id: 'almond', label: 'Amande', unlockCondition: null,
        svg: '<ellipse cx="38" cy="52" rx="5" ry="3.5" fill="#2C2C2C"/><ellipse cx="62" cy="52" rx="5" ry="3.5" fill="#2C2C2C"/><ellipse cx="38.5" cy="51" rx="2" ry="1.4" fill="white"/><ellipse cx="62.5" cy="51" rx="2" ry="1.4" fill="white"/>',
    },
    {
        id: 'small', label: 'Petit', unlockCondition: null,
        svg: '<circle cx="38" cy="52" r="2.5" fill="#2C2C2C"/><circle cx="62" cy="52" r="2.5" fill="#2C2C2C"/>',
    },
    {
        id: 'vivid', label: 'Vif', unlockCondition: { type: 'badge', id: 'streak_t2' },
        svg: '<circle cx="38" cy="52" r="5.5" fill="#2C2C2C"/><circle cx="62" cy="52" r="5.5" fill="#2C2C2C"/><circle cx="40" cy="50" r="2" fill="white"/><circle cx="64" cy="50" r="2" fill="white"/><circle cx="36.5" cy="50.5" r="1" fill="white"/><circle cx="60.5" cy="50.5" r="1" fill="white"/>',
    },
    {
        id: 'determined', label: 'Déterminé', unlockCondition: { type: 'rank', rankIndex: 2 },
        svg: '<circle cx="38" cy="53" r="4" fill="#2C2C2C"/><circle cx="62" cy="53" r="4" fill="#2C2C2C"/><circle cx="39.5" cy="51.5" r="1.5" fill="white"/><circle cx="63.5" cy="51.5" r="1.5" fill="white"/><path d="M 32 47 L 44 49.5" stroke="#2C2C2C" stroke-width="2.5" stroke-linecap="round"/><path d="M 56 49.5 L 68 47" stroke="#2C2C2C" stroke-width="2.5" stroke-linecap="round"/>',
    },
    {
        id: 'legendary', label: 'Légendaire', unlockCondition: { type: 'rank', rankIndex: 3 },
        svg: '<ellipse cx="38" cy="53" rx="5" ry="3" fill="#2C2C2C"/><ellipse cx="62" cy="53" rx="5" ry="3" fill="#2C2C2C"/><ellipse cx="38.5" cy="52" rx="2" ry="1.2" fill="white"/><ellipse cx="62.5" cy="52" rx="2" ry="1.2" fill="white"/><path d="M 33 49 Q 38 47 43 49" stroke="#2C2C2C" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M 57 49 Q 62 47 67 49" stroke="#2C2C2C" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'sleepy', label: 'Endormi', unlockCondition: { type: 'badge', id: 'nightowl_t3' },
        svg: '<path d="M 33 54 Q 38 58 43 54 Q 38 50 33 54 Z" fill="#2C2C2C"/><path d="M 57 54 Q 62 58 67 54 Q 62 50 57 54 Z" fill="#2C2C2C"/>',
    },
];

// ---- Coiffures ----
// svgBack = rendu AVANT la tête (derrière), svgFront = rendu APRÈS la tête (sur le dessus)
// {COLOR} est remplacé par la couleur hex des cheveux au moment du rendu
export const HAIR_STYLES = [
    {
        id: 'short', label: 'Court', unlockCondition: null,
        svgBack: null,
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'medium', label: 'Mi-long', unlockCondition: null,
        svgBack: null,
        svgFront: '<path d="M 18 65 Q 18 18 50 16 Q 82 18 82 65 L 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'bun', label: 'Chignon', unlockCondition: null,
        svgBack: null,
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/><circle cx="50" cy="11" r="8" fill="{COLOR}"/>',
    },
    {
        id: 'braid', label: 'Tresse', unlockCondition: null,
        svgBack: '<path d="M 19 54 Q 14 68 16 84 Q 18 76 20 84 Q 22 76 21 68 Q 24 76 22 85 L 20 88 Q 13 72 14 55 Z" fill="{COLOR}"/>',
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'afro', label: 'Afro', unlockCondition: { type: 'badge', id: 'victories_t3' },
        svgBack: '<ellipse cx="50" cy="36" rx="32" ry="27" fill="{COLOR}"/>',
        svgFront: null,
    },
    {
        id: 'mohawk', label: 'Mohawk', unlockCondition: { type: 'rank', rankIndex: 2 },
        svgBack: null,
        svgFront: '<path d="M 38 44 Q 42 14 50 10 Q 58 14 62 44 Q 56 26 50 22 Q 44 26 38 44 Z" fill="{COLOR}"/>',
    },
    {
        id: 'long', label: 'Longue', unlockCondition: { type: 'badge', id: 'habits_t3' },
        svgBack: '<path d="M 18 56 Q 14 18 50 16 Q 86 18 82 56 Q 84 72 80 94 Q 66 76 50 78 Q 34 76 20 94 Q 16 72 18 56 Z" fill="{COLOR}"/>',
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
    {
        id: 'ponytail', label: 'Queue de cheval', unlockCondition: { type: 'rank', rankIndex: 3 },
        svgBack: '<path d="M 76 44 Q 82 58 78 75 Q 74 65 76 55 Q 74 65 72 76 L 70 74 Q 72 60 74 48 Z" fill="{COLOR}"/>',
        svgFront: '<path d="M 20 52 Q 20 20 50 18 Q 80 20 80 52 Q 68 28 50 26 Q 32 28 20 52 Z" fill="{COLOR}"/>',
    },
];

// ---- Couleurs de cheveux ----
export const HAIR_COLORS = [
    { id: 'black',  label: 'Noir',  hex: '#1A1A1A', unlockCondition: null },
    { id: 'brown',  label: 'Brun',  hex: '#5C3317', unlockCondition: null },
    { id: 'blonde', label: 'Blond', hex: '#F5D060', unlockCondition: null },
    { id: 'red',    label: 'Roux',  hex: '#C0392B', unlockCondition: null },
    { id: 'white',  label: 'Blanc', hex: '#E8E8E8', unlockCondition: { type: 'rank', rankIndex: 4 } },
    { id: 'blue',   label: 'Bleu',  hex: '#00BFFF', unlockCondition: { type: 'badge', id: 'streak_t3' } },
    { id: 'pink',   label: 'Rose',  hex: '#FF69B4', unlockCondition: { type: 'badge', id: 'collector_t5' } },
];

// ---- Accessoires ----
// svg = null si aucun accessoire
export const ACCESSORIES = [
    {
        id: 'none', label: 'Aucun', unlockCondition: null,
        svg: null,
    },
    {
        id: 'glasses', label: 'Lunettes', unlockCondition: null,
        svg: '<circle cx="38" cy="52" r="7" stroke="#555" stroke-width="1.5" fill="none"/><circle cx="62" cy="52" r="7" stroke="#555" stroke-width="1.5" fill="none"/><path d="M 45 52 L 55 52" stroke="#555" stroke-width="1.5"/><path d="M 22 49 L 31 51" stroke="#555" stroke-width="1.5"/><path d="M 69 51 L 78 49" stroke="#555" stroke-width="1.5"/>',
    },
    {
        id: 'helmet', label: 'Casque', unlockCondition: { type: 'rank', rankIndex: 1 },
        svg: '<path d="M 19 58 Q 19 15 50 14 Q 81 15 81 58 L 81 64 Q 69 60 50 59 Q 31 60 19 64 Z" fill="#888"/><path d="M 19 64 Q 31 68 50 67 Q 69 68 81 64 L 81 68 Q 69 72 50 71 Q 31 72 19 68 Z" fill="#666"/>',
    },
    {
        id: 'headband', label: 'Bandeau', unlockCondition: { type: 'badge', id: 'perfect_t2' },
        svg: '<path d="M 20 44 Q 50 37 80 44 Q 80 49 50 44 Q 20 49 20 44 Z" fill="#E74C3C"/>',
    },
    {
        id: 'scar', label: 'Cicatrice', unlockCondition: { type: 'badge', id: 'victories_t2' },
        svg: '<path d="M 65 54 L 72 66" stroke="#A07070" stroke-width="2.5" stroke-linecap="round"/><path d="M 67 51 L 70 70" stroke="#D4A0A0" stroke-width="1" stroke-linecap="round" stroke-dasharray="2,2"/>',
    },
    {
        id: 'hat', label: 'Chapeau', unlockCondition: { type: 'rank', rankIndex: 2 },
        svg: '<rect x="14" y="48" width="72" height="6" rx="3" fill="#333"/><path d="M 28 48 Q 28 22 50 20 Q 72 22 72 48 Z" fill="#444"/>',
    },
    {
        id: 'crown', label: 'Couronne', unlockCondition: { type: 'rank', rankIndex: 3 },
        svg: '<path d="M 26 40 L 26 24 L 34 32 L 42 16 L 50 26 L 58 16 L 66 32 L 74 24 L 74 40 Q 50 37 26 40 Z" fill="#FFD700" stroke="#FFA500" stroke-width="1.5" stroke-linejoin="round"/>',
    },
];

// ---- Expressions (bouche) ----
export const EXPRESSIONS = [
    {
        id: 'smile', label: 'Sourire', unlockCondition: null,
        svg: '<path d="M 38 68 Q 50 78 62 68" stroke="#2C2C2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'neutral', label: 'Neutre', unlockCondition: null,
        svg: '<path d="M 38 70 L 62 70" stroke="#2C2C2C" stroke-width="2.5" stroke-linecap="round"/>',
    },
    {
        id: 'determined', label: 'Déterminé', unlockCondition: null,
        svg: '<path d="M 38 71 Q 50 67 62 71" stroke="#2C2C2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'smirk', label: 'Sourire malin', unlockCondition: { type: 'rank', rankIndex: 1 },
        svg: '<path d="M 40 70 Q 50 76 60 66" stroke="#2C2C2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'intense', label: 'Intense', unlockCondition: { type: 'badge', id: 'streak_t3' },
        svg: '<path d="M 37 72 Q 50 65 63 72" stroke="#2C2C2C" stroke-width="3" fill="none" stroke-linecap="round"/>',
    },
    {
        id: 'legendary', label: 'Légendaire', unlockCondition: { type: 'rank', rankIndex: 4 },
        svg: '<path d="M 36 68 Q 50 80 64 68 Q 56 74 50 75 Q 44 74 36 68 Z" fill="#2C2C2C"/>',
    },
];

// ---- Config par défaut ----
export const DEFAULT_CONFIG = {
    skinTone:   'medium',
    eyeStyle:   'round',
    hairStyle:  'short',
    hairColor:  'brown',
    accessory:  'none',
    expression: 'smile',
};

// ---- Noms des catégories pour l'affichage ----
export const CATEGORY_LABELS = {
    skinTone:   'Peau',
    eyeStyle:   'Yeux',
    hairStyle:  'Coiffure',
    hairColor:  'Couleur',
    accessory:  'Accessoire',
    expression: 'Expression',
};

// ---- Mapping catégorie → catalogue ----
export const CATALOG_MAP = {
    skinTone:   SKIN_TONES,
    eyeStyle:   EYE_STYLES,
    hairStyle:  HAIR_STYLES,
    hairColor:  HAIR_COLORS,
    accessory:  ACCESSORIES,
    expression: EXPRESSIONS,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/character-parts.js
git commit -m "feat: add character SVG parts catalog"
```

---

### Task 2: Create `src/ui/character.css`

**Files:**
- Create: `src/ui/character.css`

- [ ] **Step 1: Create the file**

```css
/* ============================================================
   CHARACTER — SVG + Picker
   ============================================================ */

.character-svg {
    display: block;
    flex-shrink: 0;
}

/* ---- Picker modal ---- */
.character-picker-modal {
    max-width: 420px;
    width: 95vw;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 16px;
}

.character-picker-modal h3 {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-align: center;
    color: var(--text, #F5F5F0);
}

/* ---- Aperçu live ---- */
.character-picker-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    margin-bottom: 12px;
    min-height: 96px;
}

/* ---- Onglets ---- */
.character-picker-tabs {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    gap: 6px;
    margin-bottom: 10px;
    padding-bottom: 2px;
}

.character-picker-tabs::-webkit-scrollbar {
    display: none;
}

.char-tab {
    flex: 0 0 auto;
    padding: 5px 12px;
    border-radius: 20px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: #aaa;
    cursor: pointer;
    font-size: 0.72rem;
    white-space: nowrap;
    transition: background 0.15s, color 0.15s;
}

.char-tab--active {
    background: var(--accent, #4B9CD3);
    color: #fff;
}

/* ---- Grille d'options ---- */
.character-picker-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    overflow-y: auto;
    flex: 1;
    padding: 2px;
}

.char-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    border-radius: 10px;
    border: 2px solid transparent;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.05);
    transition: background 0.15s, border-color 0.15s;
    position: relative;
    min-height: 60px;
    justify-content: center;
}

.char-option:hover:not(.char-option--locked) {
    background: rgba(255, 255, 255, 0.1);
}

.char-option--active {
    border-color: var(--accent, #4B9CD3);
    background: rgba(75, 156, 211, 0.15);
}

.char-option--locked {
    opacity: 0.4;
    cursor: not-allowed;
}

.char-option-label {
    font-size: 0.62rem;
    color: #ccc;
    text-align: center;
    line-height: 1.2;
}

.char-option-lock {
    font-size: 0.55rem;
    color: #888;
    text-align: center;
    line-height: 1.2;
}

/* Swatch couleur (peau / cheveux) */
.char-option-swatch {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
}

/* ---- Footer boutons ---- */
.character-picker-footer {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.character-picker-footer .modal-btn {
    flex: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/character.css
git commit -m "feat: add character picker CSS styles"
```

---

### Task 3: Create `src/ui/character.js` — config, unlock, save

**Files:**
- Create: `src/ui/character.js`

- [ ] **Step 1: Create the file with config + unlock + save functions**

```js
// ============================================================
// CHARACTER MODULE — Avatar personnage SVG
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { appState } from '../services/state.js';
import { db, isFirebaseConfigured } from '../config/firebase.js';
import { loadBadges } from '../core/badges.js';
import { rankSettings, getRank } from '../core/ranks.js';
import { getAvgScore } from '../core/scores.js';

import {
    DEFAULT_CONFIG, CATALOG_MAP,
    SKIN_TONES, EYE_STYLES, HAIR_STYLES, HAIR_COLORS, ACCESSORIES, EXPRESSIONS,
    CATEGORY_LABELS,
} from './character-parts.js';

// Re-export DEFAULT_CONFIG so avatar.js can import it
export { DEFAULT_CONFIG };

// ============================================================
// HELPERS INTERNES
// ============================================================

function getCurrentRankIndex() {
    const avgScore = getAvgScore();
    const rank = getRank(avgScore);
    const idx = rankSettings.findIndex(r => r.name === rank.name);
    return idx >= 0 ? idx : 0;
}

// ============================================================
// CONFIG
// ============================================================

export function getAvatarConfig() {
    const data = getData();
    const profile = data.profile || {};
    return { ...DEFAULT_CONFIG, ...(profile.avatarConfig || {}) };
}

export function saveAvatarConfig(config) {
    const data = getData();
    if (!data.profile) data.profile = {};
    data.profile.avatarConfig = config;
    saveData(data);

    if (isFirebaseConfigured && appState.currentUser) {
        db.collection('users').doc(appState.currentUser.uid)
            .set({ profile: { avatarConfig: config } }, { merge: true })
            .catch(err => console.error('❌ Erreur sync avatarConfig:', err));
    }

    // Rafraîchir l'avatar sur la page profil si visible
    const profileAvatarEl = document.getElementById('profileAvatarWrap');
    if (profileAvatarEl) {
        const { renderAvatar } = window._avatarModule || {};
        if (renderAvatar) {
            profileAvatarEl.outerHTML = renderAvatar({ size: 'large', id: 'profileAvatarWrap' });
        }
    }
}

// ============================================================
// UNLOCK
// ============================================================

export function getUnlockedOptions(category) {
    const catalog = CATALOG_MAP[category] || [];
    const unlockedBadges = loadBadges();
    const rankIndex = getCurrentRankIndex();

    return catalog
        .filter(option => {
            if (!option.unlockCondition) return true;
            if (option.unlockCondition.type === 'badge') return unlockedBadges.includes(option.unlockCondition.id);
            if (option.unlockCondition.type === 'rank')  return rankIndex >= option.unlockCondition.rankIndex;
            return false;
        })
        .map(o => o.id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/character.js
git commit -m "feat: character.js config, unlock and save functions"
```

---

### Task 4: Add `renderCharacter()` to `character.js`

**Files:**
- Modify: `src/ui/character.js`

`renderCharacter()` assembles a full inline SVG from a config object. Sizes: `large` = 96px, `small` = 44px, `tiny` = 36px (used in picker grid previews).

- [ ] **Step 1: Append renderCharacter to the bottom of `src/ui/character.js`**

```js
// ============================================================
// RENDU
// ============================================================

/**
 * Génère un SVG inline représentant le personnage.
 * @param {Object} opts
 * @param {Object} [opts.config]  — avatarConfig (défaut: getAvatarConfig())
 * @param {'large'|'small'|'tiny'} [opts.size] — 96 / 44 / 36 px
 */
export function renderCharacter({ config, size = 'large' } = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...(config || getAvatarConfig()) };

    const skinTone   = SKIN_TONES.find(s => s.id === cfg.skinTone)   || SKIN_TONES[2];
    const eyeStyle   = EYE_STYLES.find(e => e.id === cfg.eyeStyle)   || EYE_STYLES[0];
    const hairStyle  = HAIR_STYLES.find(h => h.id === cfg.hairStyle)  || HAIR_STYLES[0];
    const hairColor  = HAIR_COLORS.find(c => c.id === cfg.hairColor)  || HAIR_COLORS[0];
    const accessory  = ACCESSORIES.find(a => a.id === cfg.accessory)  || ACCESSORIES[0];
    const expression = EXPRESSIONS.find(e => e.id === cfg.expression) || EXPRESSIONS[0];

    const skin = skinTone.hex;
    const hair = hairColor.hex;
    const dim  = size === 'large' ? 96 : size === 'small' ? 44 : 36;

    let s = '';

    // 1. Cheveux arrière
    if (hairStyle.svgBack) s += hairStyle.svgBack.replace(/{COLOR}/g, hair);

    // 2. Oreilles (derrière la tête)
    s += `<ellipse cx="20" cy="58" rx="4" ry="6" fill="${skin}"/>`;
    s += `<ellipse cx="80" cy="58" rx="4" ry="6" fill="${skin}"/>`;

    // 3. Tête
    s += `<ellipse cx="50" cy="58" rx="30" ry="35" fill="${skin}"/>`;

    // 4. Nez (discret)
    s += `<ellipse cx="50" cy="62" rx="2.5" ry="1.5" fill="rgba(0,0,0,0.12)"/>`;

    // 5. Cheveux avant
    if (hairStyle.svgFront) s += hairStyle.svgFront.replace(/{COLOR}/g, hair);

    // 6. Yeux
    s += eyeStyle.svg;

    // 7. Expression (bouche)
    s += expression.svg;

    // 8. Accessoire
    if (accessory.svg) s += accessory.svg;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${dim}" height="${dim}" class="character-svg">${s}</svg>`;
}
```

- [ ] **Step 2: Verify manually** — Open browser console on the app, run:
```js
import('/src/ui/character.js').then(m => {
    document.body.insertAdjacentHTML('beforeend', m.renderCharacter({ size: 'large' }));
});
```
Expected: a cartoon face appears at the bottom of the page.

- [ ] **Step 3: Commit**

```bash
git add src/ui/character.js
git commit -m "feat: renderCharacter() SVG assembly function"
```

---

### Task 5: Add picker functions to `character.js`

**Files:**
- Modify: `src/ui/character.js`

The picker keeps a module-level draft config (`_draftConfig`) that is updated as the user clicks options but not saved until "Enregistrer" is clicked. Functions exposed to `window` via `app.js`: `openCharacterPicker`, `closeCharacterPicker`, `selectCharacterOption`, `switchCharacterTab`, `saveCharacterConfig`.

- [ ] **Step 1: Append picker functions to the bottom of `src/ui/character.js`**

```js
// ============================================================
// PICKER
// ============================================================

let _draftConfig  = null;
let _activeTab    = 'skinTone';
const TAB_ORDER   = ['skinTone', 'eyeStyle', 'hairStyle', 'hairColor', 'accessory', 'expression'];

// ---- Rendu interne ----

function _updatePickerPreview() {
    const el = document.getElementById('characterPickerPreview');
    if (!el) return;
    el.innerHTML = renderCharacter({ config: _draftConfig, size: 'large' });
}

function _renderPickerGrid(tabName) {
    const catalog       = CATALOG_MAP[tabName] || [];
    const unlockedIds   = getUnlockedOptions(tabName);
    const activeId      = _draftConfig[tabName];
    const isSwatch      = tabName === 'skinTone' || tabName === 'hairColor';

    const neutralPreview = { ...DEFAULT_CONFIG };

    return catalog.map(option => {
        const isUnlocked = unlockedIds.includes(option.id);
        const isActive   = option.id === activeId;
        const activeCls  = isActive    ? ' char-option--active' : '';
        const lockedCls  = !isUnlocked ? ' char-option--locked' : '';
        const onclick    = isUnlocked  ? `onclick="selectCharacterOption('${tabName}','${option.id}')"` : '';

        let visual = '';
        if (isSwatch) {
            visual = `<div class="char-option-swatch" style="background:${option.hex};"></div>`;
        } else {
            const previewCfg = { ...neutralPreview, [tabName]: option.id };
            visual = renderCharacter({ config: previewCfg, size: 'tiny' });
        }

        const lockHint = !isUnlocked
            ? `<span class="char-option-lock">🔒 ${option.unlockCondition?.type === 'rank' ? 'Rang requis' : 'Badge requis'}</span>`
            : '';

        return `<div class="char-option${activeCls}${lockedCls}" ${onclick}>
            ${visual}
            <span class="char-option-label">${option.label}</span>
            ${lockHint}
        </div>`;
    }).join('');
}

function _renderTabs() {
    return TAB_ORDER.map(tab => {
        const activeCls = tab === _activeTab ? ' char-tab--active' : '';
        return `<button class="char-tab${activeCls}" onclick="switchCharacterTab('${tab}')">${CATEGORY_LABELS[tab]}</button>`;
    }).join('');
}

// ---- API publique ----

export function openCharacterPicker() {
    _draftConfig = { ...getAvatarConfig() };
    _activeTab   = 'skinTone';

    const modal = document.getElementById('characterPickerModal');
    if (!modal) return;

    document.getElementById('characterPickerTabs').innerHTML  = _renderTabs();
    document.getElementById('characterPickerGrid').innerHTML  = _renderPickerGrid(_activeTab);
    _updatePickerPreview();

    modal.classList.add('active');
}

export function closeCharacterPicker() {
    const modal = document.getElementById('characterPickerModal');
    if (modal) modal.classList.remove('active');
}

export function switchCharacterTab(tabName) {
    _activeTab = tabName;
    document.getElementById('characterPickerTabs').innerHTML = _renderTabs();
    document.getElementById('characterPickerGrid').innerHTML = _renderPickerGrid(tabName);
}

export function selectCharacterOption(category, optionId) {
    const unlockedIds = getUnlockedOptions(category);
    if (!unlockedIds.includes(optionId)) return;
    _draftConfig[category] = optionId;
    _updatePickerPreview();
    document.getElementById('characterPickerGrid').innerHTML = _renderPickerGrid(category);
}

export function saveCharacterConfig() {
    if (!_draftConfig) return;
    saveAvatarConfig(_draftConfig);
    closeCharacterPicker();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/character.js
git commit -m "feat: character picker — tabs, grid, preview, save"
```

---

### Task 6: Modify `src/ui/avatar.js`

**Files:**
- Modify: `src/ui/avatar.js`

Replace the emoji `<span>` in `renderAvatar()` with a call to `renderCharacter()`. Update the signature: `emoji` param is replaced by `avatarConfig`. Logic:
- `avatarConfig` not passed (`undefined`) → use `getAvatarConfig()` (current user, profile page)
- `avatarConfig: null` → use `DEFAULT_CONFIG` (old chat messages without config stored)
- `avatarConfig: { ... }` → use that config (other user's config from chat messages)

Also expose `_avatarModule` on window so `saveAvatarConfig` in `character.js` can trigger a profile re-render.

- [ ] **Step 1: Add import at the top of `src/ui/avatar.js`** (after existing imports)

In `src/ui/avatar.js`, the current imports are:
```js
import { getData, saveData } from '../services/storage.js';
import { appState } from '../services/state.js';
import { db, isFirebaseConfigured } from '../config/firebase.js';
import { loadBadges } from '../core/badges.js';
import { rankSettings, getRank } from '../core/ranks.js';
import { getAvgScore } from '../core/scores.js';
```

Add after the last import:
```js
import { renderCharacter, getAvatarConfig, DEFAULT_CONFIG } from './character.js';
```

- [ ] **Step 2: Replace `renderAvatar()` in `src/ui/avatar.js`**

Replace the entire `renderAvatar` function (lines 95–120) with:

```js
/**
 * Génère le HTML d'un avatar (personnage SVG + aura).
 * @param {Object} opts
 * @param {Object|null|undefined} [opts.avatarConfig]
 *   — undefined  : config du profil courant (page profil)
 *   — null       : config par défaut (vieux messages chat sans config)
 *   — { ... }    : config d'un autre utilisateur
 * @param {string|null} [opts.auraId]  — ID de l'aura active
 * @param {'large'|'small'} [opts.size]
 * @param {boolean} [opts.isMaitre]
 * @param {string}  [opts.id]
 */
export function renderAvatar({ avatarConfig, auraId, size = 'large', isMaitre = false, id = 'profileAvatarWrap' } = {}) {
    const config = avatarConfig === undefined
        ? getAvatarConfig()
        : (avatarConfig || DEFAULT_CONFIG);

    const data    = getData();
    const profile = data.profile || {};
    const resolvedAuraId = auraId !== undefined ? auraId : (profile.activeAura || null);
    const aura = resolvedAuraId ? AURAS.find(a => a.id === resolvedAuraId) : null;

    const chatCls   = size === 'small' ? ' avatar-wrap--chat' : '';
    const maitreCls = (size === 'small' && isMaitre) ? ' avatar-wrap--maitre' : '';
    const wrapClass = `avatar-wrap avatar-wrap--${size}${chatCls}${maitreCls}`;

    let ringsHtml = '';
    if (aura) {
        const ringCount = aura.rings || 1;
        for (let i = 0; i < ringCount; i++) {
            ringsHtml += `<div class="aura-ring"></div>`;
        }
    }

    const auraClass = aura ? `aura-${aura.id}` : '';

    return `<div class="${wrapClass}" id="${id}">
        <div class="${auraClass}">${ringsHtml}</div>
        ${renderCharacter({ config, size })}
    </div>`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/avatar.js
git commit -m "feat: renderAvatar uses renderCharacter instead of emoji span"
```

---

### Task 7: Modify `src/ui/chat.js`

**Files:**
- Modify: `src/ui/chat.js`

Add `senderAvatarConfig` to the data saved with each sent message (text messages and audio). Update the message rendering to pass `senderAvatarConfig` to `renderAvatar()`.

- [ ] **Step 1: Find the message send functions**

Search in `src/ui/chat.js` for the three places where a message object is constructed and written to Firestore. They look like:
```js
senderAvatar: profile.avatar || '🦁',
senderAura:   profile.activeAura || null,
```

- [ ] **Step 2: Add `senderAvatarConfig` to each message write**

In each of the three message-construction blocks, add this line immediately after the `senderAura` line:
```js
senderAvatarConfig: profile.avatarConfig || null,
```

There are 3 occurrences (text message send, audio message send, stop-and-send audio). Add `senderAvatarConfig: profile.avatarConfig || null,` to all 3.

- [ ] **Step 3: Update the message rendering function**

Find the part of `chat.js` where individual messages are rendered into HTML (the function that produces a `<div class="chat-bubble ...">` or similar). It currently calls `renderAvatar()` like:
```js
renderAvatar({ emoji: msg.senderAvatar || '🦁', auraId: msg.senderAura, size: 'small', ... })
```

Replace each such call with:
```js
renderAvatar({ avatarConfig: msg.senderAvatarConfig || null, auraId: msg.senderAura, size: 'small', isMaitre: false, id: `chat-avatar-${msgId}` })
```

(Remove the `emoji` parameter — it no longer exists on `renderAvatar`.)

- [ ] **Step 4: Commit**

```bash
git add src/ui/chat.js
git commit -m "feat: chat messages store and render senderAvatarConfig"
```

---

### Task 8: Modify `index.html`

**Files:**
- Modify: `index.html`

Three changes:
1. Add `<link>` for `character.css` after the existing `avatar.css` link
2. Replace the `#avatarPickerModal` (emoji picker) with the new `#characterPickerModal`
3. Update the "Changer l'avatar" button to call `openCharacterPicker()`

- [ ] **Step 1: Add CSS link**

After line 65 (`<link rel="stylesheet" href="src/ui/avatar.css">`), add:
```html
  <link rel="stylesheet" href="src/ui/character.css">
```

- [ ] **Step 2: Update the "Changer l'avatar" button**

Find (around line 1138):
```html
        <button class="profile-change-avatar-btn" onclick="openAvatarPicker()">
          Changer l'avatar
        </button>
```

Replace with:
```html
        <button class="profile-change-avatar-btn" onclick="openCharacterPicker()">
          Changer l'avatar
        </button>
```

- [ ] **Step 3: Replace the avatar picker modal**

Find (around line 1297–1310):
```html
  <!-- Modal Avatar Picker -->
  <div class="modal-overlay" id="avatarPickerModal">
    <div class="modal">
      <h3>CHOISIS TON AVATAR</h3>
      <div class="avatar-picker-grid" id="avatarPickerGrid">
        <!-- Rempli par JavaScript -->
      </div>
      <div class="modal-buttons">
        <button class="modal-btn cancel" onclick="closeAvatarPicker()">
          Fermer
        </button>
      </div>
    </div>
  </div>
```

Replace with:
```html
  <!-- Modal Character Picker -->
  <div class="modal-overlay" id="characterPickerModal">
    <div class="modal character-picker-modal">
      <h3>PERSONNALISER L'AVATAR</h3>
      <div class="character-picker-preview" id="characterPickerPreview"></div>
      <div class="character-picker-tabs" id="characterPickerTabs"></div>
      <div class="character-picker-grid" id="characterPickerGrid"></div>
      <div class="character-picker-footer modal-buttons">
        <button class="modal-btn cancel" onclick="closeCharacterPicker()">Annuler</button>
        <button class="modal-btn confirm" onclick="saveCharacterConfig()">Enregistrer</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: replace emoji avatar picker modal with character picker"
```

---

### Task 9: Modify `src/app.js` and `sw.js`

**Files:**
- Modify: `src/app.js`
- Modify: `sw.js`

Expose the character picker functions to `window` (they're called from dynamically-generated `onclick` attributes). Remove the no-longer-needed `openAvatarPicker`, `closeAvatarPicker`, `selectAvatar` exposures. Bump the SW cache version.

- [ ] **Step 1: Update imports in `src/app.js`**

Find (around line 73):
```js
    renderProfile, openAvatarPicker, closeAvatarPicker, selectAvatar,
```

Replace with:
```js
    renderProfile,
```

(`openAvatarPicker`, `closeAvatarPicker`, `selectAvatar` are no longer called from window.)

- [ ] **Step 2: Add character.js imports to `src/app.js`**

After the line that imports from `./ui/avatar.js` (around line 78):
```js
import { openAuraPicker, closeAuraPicker, setActiveAura } from './ui/avatar.js';
```

Add:
```js
import {
    openCharacterPicker, closeCharacterPicker,
    selectCharacterOption, switchCharacterTab, saveCharacterConfig,
} from './ui/character.js';
```

- [ ] **Step 3: Expose character functions on window**

Find the `Object.assign(window, {...})` block. Locate the comment `// Profile` section which currently has:
```js
    openAvatarPicker, closeAvatarPicker, selectAvatar,
    openAuraPicker, closeAuraPicker, setActiveAura,
```

Replace with:
```js
    openCharacterPicker, closeCharacterPicker,
    selectCharacterOption, switchCharacterTab, saveCharacterConfig,
    openAuraPicker, closeAuraPicker, setActiveAura,
```

- [ ] **Step 4: Bump cache version in `sw.js`**

Find (line 46):
```js
const CACHE_NAME = 'warrior-tracker-v106';
```

Replace with:
```js
const CACHE_NAME = 'warrior-tracker-v107';
```

- [ ] **Step 5: Final commit**

```bash
git add src/app.js sw.js
git commit -m "feat: expose character picker to window, bump cache v107"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Cartoon 2D style (style A) | Task 1 (SVG paths designed as simple cartoon shapes) |
| 6 customizable parts (skin, eyes, hair, hair color, accessory, expression) | Task 1 (6 catalog arrays) |
| 6-8 options per category | Task 1 (6/7/8/7/7/6 options) |
| Base options free + premium via badges/ranks | Task 1 (unlockCondition on each entry) |
| Total replacement of emoji | Tasks 6, 7, 8 |
| profile.avatarConfig storage + Firestore sync | Task 3 |
| Picker with live preview + tabs | Task 5 + Task 8 |
| Unlock system (rank + badge) | Task 3 (getUnlockedOptions) |
| Locked options shown greyed + lock hint | Task 5 (_renderPickerGrid) |
| Aura system preserved | Task 6 (renderAvatar wraps renderCharacter, rings unchanged) |
| Migration transparent (old accounts) | Task 3 (DEFAULT_CONFIG spread) |
| Chat shows character instead of emoji | Tasks 6, 7 |
| React Native friendly (SVG data isolated) | Task 1 (pure constants), renderCharacter is the only rendering function |

**Placeholder scan:** No TBD/TODO found.

**Type consistency check:**
- `DEFAULT_CONFIG` defined in Task 1 (`character-parts.js`), imported in Task 3 (`character.js`), re-exported from Task 3, imported in Task 6 (`avatar.js`) ✅
- `renderCharacter({ config, size })` defined in Task 4, called in Task 5 (picker) and Task 6 (avatar.js) ✅
- `getAvatarConfig()` defined in Task 3, called in Task 4 (default fallback) and Task 5 (openCharacterPicker) ✅
- `getUnlockedOptions(category)` defined in Task 3, called in Task 5 ✅
- `saveAvatarConfig(config)` defined in Task 3, called in Task 5 (saveCharacterConfig) ✅
- `selectCharacterOption(category, optionId)` defined in Task 5, exposed via window in Task 9 ✅
- `switchCharacterTab(tabName)` defined in Task 5, exposed via window in Task 9 ✅
- `saveCharacterConfig()` defined in Task 5, exposed via window in Task 9 ✅
- `senderAvatarConfig` field written in Task 7 (send), read in Task 7 (render) ✅
