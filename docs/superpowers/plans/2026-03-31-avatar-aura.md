# Avatar Aura System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système d'auras animées autour des avatars emoji, déblocables via les rangs et les badges, affichées en pleine intensité sur le profil et en version discrète dans le chat de groupe.

**Architecture:** Nouveau module `src/ui/avatar.js` (catalogue AURAS + logique de débloquage + rendu HTML) + `src/ui/avatar.css` (toutes les animations CSS). Les fichiers existants (`profile.js`, `chat.js`, `app.js`, `index.html`) sont modifiés minimalement pour brancher le module.

**Tech Stack:** ES6 modules natifs, CSS animations (`@keyframes`, `box-shadow`), Firebase Firestore (champ `activeAura` dans `profile`).

---

## Fichiers concernés

| Fichier | Action | Rôle |
|---|---|---|
| `src/ui/avatar.css` | **Créer** | Toutes les animations et classes d'aura |
| `src/ui/avatar.js` | **Créer** | Catalogue AURAS, débloquage, rendu HTML |
| `src/pages/profile.js` | **Modifier** | Intégrer renderAuraPicker + setActiveAura |
| `src/ui/chat.js` | **Modifier** | Inclure senderAura dans les messages, appel renderAvatar |
| `src/app.js` | **Modifier** | Exposer openAuraPicker, closeAuraPicker, setActiveAura |
| `index.html` | **Modifier** | Lien CSS, structure avatar profil, modal aura picker |

---

## Task 1 — Créer `src/ui/avatar.css`

**Files:**
- Create: `src/ui/avatar.css`

- [ ] **Créer le fichier avec les animations de rang**

```css
/* ============================================================
   AVATAR AURA SYSTEM
   ============================================================ */

/* --- Conteneur avatar --- */
.avatar-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.avatar-emoji {
    position: relative;
    z-index: 2;
    line-height: 1;
}

/* --- Anneaux de base --- */
.aura-ring {
    position: absolute;
    border-radius: 50%;
    border: 2px solid transparent;
    pointer-events: none;
}

/* ============================================================
   AURAS DE RANG — profil (pleine intensité, animées)
   ============================================================ */

/* ACIER (Débutant) — halo simple, lent */
@keyframes aura-acier-pulse {
    0%, 100% { box-shadow: 0 0 6px 2px #7B8FA155; }
    50%       { box-shadow: 0 0 12px 4px #7B8FA199; }
}
.aura-acier .aura-ring:nth-child(1) {
    border-color: #7B8FA1;
    animation: aura-acier-pulse 3.5s ease-in-out infinite;
}

/* AZUR (Apprenti) — double anneau qui respire */
@keyframes aura-azur-inner {
    0%, 100% { box-shadow: 0 0 10px 3px #4B9CD3; }
    50%       { box-shadow: 0 0 18px 6px #4B9CD3; }
}
@keyframes aura-azur-outer {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 0.7; }
}
.aura-azur .aura-ring:nth-child(1) {
    border-color: #4B9CD3;
    animation: aura-azur-inner 2.8s ease-in-out infinite;
}
.aura-azur .aura-ring:nth-child(2) {
    border-color: #4B9CD355;
    animation: aura-azur-outer 2.8s ease-in-out infinite 0.4s;
}

/* BRAISE (Confirmé) — solide + pointillé tournant */
@keyframes aura-braise-glow {
    0%, 100% { box-shadow: 0 0 12px 4px #E74C3C; }
    50%       { box-shadow: 0 0 20px 8px #E74C3C; }
}
@keyframes aura-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
.aura-braise .aura-ring:nth-child(1) {
    border-color: #E74C3C;
    animation: aura-braise-glow 2.5s ease-in-out infinite;
}
.aura-braise .aura-ring:nth-child(2) {
    border-style: dashed;
    border-color: #E74C3C88;
    animation: aura-spin 4s linear infinite;
}

/* DORÉE (Expert) — triple ring en cascade pulsant */
@keyframes aura-doree-core {
    0%, 100% { box-shadow: 0 0 14px 5px #FFD700, 0 0 28px 10px #FFD70044; }
    50%       { box-shadow: 0 0 24px 10px #FFD700, 0 0 48px 18px #FFD70088; }
}
@keyframes aura-doree-mid {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.8; }
}
@keyframes aura-doree-outer {
    0%, 100% { opacity: 0.2; }
    50%       { opacity: 0.5; }
}
.aura-doree .aura-ring:nth-child(1) {
    border-color: #FFD700;
    animation: aura-doree-core 2.2s ease-in-out infinite;
}
.aura-doree .aura-ring:nth-child(2) {
    border-color: #FFD70066;
    animation: aura-doree-mid 2.2s ease-in-out infinite 0.3s;
}
.aura-doree .aura-ring:nth-child(3) {
    border-color: #FFD70033;
    animation: aura-doree-outer 2.2s ease-in-out infinite 0.6s;
}

/* SACRÉE (Maître) — multi-ring + glow max + anneau doré tournant */
@keyframes aura-sacree-core {
    0%, 100% { box-shadow: 0 0 20px 8px #FFFAF0, 0 0 40px 16px #FFFAF066, 0 0 60px 24px #FFFAF022; }
    50%       { box-shadow: 0 0 30px 14px #FFFAF0, 0 0 60px 24px #FFD70099, 0 0 80px 32px #FFFAF044; }
}
@keyframes aura-sacree-mid {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.9; }
}
.aura-sacree .aura-ring:nth-child(1) {
    border-color: #FFFAF0;
    border-width: 3px;
    animation: aura-sacree-core 1.8s ease-in-out infinite;
}
.aura-sacree .aura-ring:nth-child(2) {
    border-color: #FFFAF066;
    animation: aura-sacree-mid 1.8s ease-in-out infinite 0.3s;
}
.aura-sacree .aura-ring:nth-child(3) {
    border-style: dashed;
    border-color: #FFD70088;
    animation: aura-spin 3s linear infinite;
}

/* ============================================================
   AURAS SPÉCIALES (badges) — même principe, couleurs thématiques
   ============================================================ */

@keyframes aura-special-pulse-flammes {
    0%, 100% { box-shadow: 0 0 12px 4px #FF6B35, 0 0 24px 8px #FF6B3533; }
    50%       { box-shadow: 0 0 22px 9px #FF6B35, 0 0 44px 14px #FF6B3566; }
}
.aura-flammes .aura-ring:nth-child(1) {
    border-color: #FF6B35;
    animation: aura-special-pulse-flammes 2s ease-in-out infinite;
}

@keyframes aura-special-pulse-blizzard {
    0%, 100% { box-shadow: 0 0 12px 4px #00D4FF, 0 0 24px 8px #00D4FF33; }
    50%       { box-shadow: 0 0 22px 9px #00D4FF, 0 0 44px 14px #00D4FF66; }
}
.aura-blizzard .aura-ring:nth-child(1) {
    border-color: #00D4FF;
    animation: aura-special-pulse-blizzard 2.3s ease-in-out infinite;
}

@keyframes aura-special-pulse-foudre {
    0%, 100% { box-shadow: 0 0 12px 4px #FFFF00, 0 0 24px 8px #FFFF0033; }
    50%       { box-shadow: 0 0 22px 9px #FFFF00, 0 0 44px 14px #FFFF0066; }
}
.aura-foudre .aura-ring:nth-child(1) {
    border-color: #FFFF00;
    animation: aura-special-pulse-foudre 1.8s ease-in-out infinite;
}

@keyframes aura-special-pulse-ombre {
    0%, 100% { box-shadow: 0 0 12px 4px #8B5CF6, 0 0 24px 8px #8B5CF633; }
    50%       { box-shadow: 0 0 22px 9px #8B5CF6, 0 0 44px 14px #8B5CF666; }
}
.aura-ombre .aura-ring:nth-child(1) {
    border-color: #8B5CF6;
    animation: aura-special-pulse-ombre 2.6s ease-in-out infinite;
}

@keyframes aura-special-pulse-verdure {
    0%, 100% { box-shadow: 0 0 12px 4px #39FF14, 0 0 24px 8px #39FF1433; }
    50%       { box-shadow: 0 0 22px 9px #39FF14, 0 0 44px 14px #39FF1466; }
}
.aura-verdure .aura-ring:nth-child(1) {
    border-color: #39FF14;
    animation: aura-special-pulse-verdure 2.4s ease-in-out infinite;
}

@keyframes aura-special-pulse-celeste {
    0%, 100% { box-shadow: 0 0 14px 5px #B9F2FF, 0 0 28px 10px #B9F2FF44; }
    50%       { box-shadow: 0 0 26px 11px #B9F2FF, 0 0 52px 18px #B9F2FF77; }
}
.aura-celeste .aura-ring:nth-child(1) {
    border-color: #B9F2FF;
    animation: aura-special-pulse-celeste 2.1s ease-in-out infinite;
}

@keyframes aura-special-pulse-prestige {
    0%, 100% { box-shadow: 0 0 16px 6px #FF00FF, 0 0 32px 12px #FFD70055; }
    50%       { box-shadow: 0 0 28px 12px #00D4FF, 0 0 56px 20px #FF00FF44; }
}
.aura-prestige .aura-ring:nth-child(1) {
    border-color: #FF00FF;
    animation: aura-special-pulse-prestige 1.6s ease-in-out infinite;
}

/* ============================================================
   MODE CHAT — version discrète (statique, sans pulse)
   Exception : .aura-chat--maitre garde l'anneau tournant
   ============================================================ */

.avatar-wrap--chat .aura-ring {
    animation: none !important;
    box-shadow: none !important;
}

/* Glow statique léger = calculé via filter au lieu d'animation */
.avatar-wrap--chat .aura-acier   .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #7B8FA155; }
.avatar-wrap--chat .aura-azur    .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #4B9CD355; }
.avatar-wrap--chat .aura-braise  .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #E74C3C55; }
.avatar-wrap--chat .aura-doree   .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #FFD70055; }
.avatar-wrap--chat .aura-sacree  .aura-ring:nth-child(1) { box-shadow: 0 0 6px 2px #FFFAF055; }
.avatar-wrap--chat .aura-flammes .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #FF6B3555; }
.avatar-wrap--chat .aura-blizzard .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #00D4FF55; }
.avatar-wrap--chat .aura-foudre  .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #FFFF0055; }
.avatar-wrap--chat .aura-ombre   .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #8B5CF655; }
.avatar-wrap--chat .aura-verdure .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #39FF1455; }
.avatar-wrap--chat .aura-celeste .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #B9F2FF55; }
.avatar-wrap--chat .aura-prestige .aura-ring:nth-child(1) { box-shadow: 0 0 5px 1px #FF00FF55; }

/* Exception Maître en chat : anneau pointillé doré qui tourne lentement */
.avatar-wrap--chat.avatar-wrap--maitre .aura-sacree .aura-ring:nth-child(3) {
    animation: aura-spin 6s linear infinite !important;
}

/* ============================================================
   TAILLES
   ============================================================ */

/* Large (profil) */
.avatar-wrap--large { width: 96px; height: 96px; }
.avatar-wrap--large .avatar-emoji { font-size: 48px; }
.avatar-wrap--large .aura-ring:nth-child(1) { width: 80px; height: 80px; }
.avatar-wrap--large .aura-ring:nth-child(2) { width: 92px; height: 92px; }
.avatar-wrap--large .aura-ring:nth-child(3) { width: 104px; height: 104px; }

/* Small (chat) */
.avatar-wrap--small { width: 44px; height: 44px; }
.avatar-wrap--small .avatar-emoji { font-size: 20px; }
.avatar-wrap--small .aura-ring:nth-child(1) { width: 36px; height: 36px; }
.avatar-wrap--small .aura-ring:nth-child(2) { width: 43px; height: 43px; }
.avatar-wrap--small .aura-ring:nth-child(3) { width: 50px; height: 50px; }

/* ============================================================
   PICKER D'AURA (page profil)
   ============================================================ */

.aura-picker-section-title {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    color: var(--steel);
    text-transform: uppercase;
    margin: 14px 0 8px;
}

.aura-picker-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 8px;
}

.aura-picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.aura-picker-item--locked {
    opacity: 0.35;
    filter: grayscale(100%);
    cursor: default;
    pointer-events: none;
}

.aura-picker-name {
    font-size: 0.6rem;
    text-align: center;
    white-space: nowrap;
}

.aura-picker-item--active .avatar-wrap {
    outline: 3px solid #fff;
    outline-offset: 4px;
    border-radius: 50%;
}

.aura-picker-lock {
    font-size: 0.6rem;
    color: var(--steel);
    text-align: center;
    max-width: 60px;
}
```

- [ ] **Vérifier dans le navigateur** — ouvrir `index.html`, ouvrir la console DevTools, vérifier qu'aucune erreur CSS n'est présente (le fichier ne sera pas encore chargé à cette étape — on le branchera en Task 4)

- [ ] **Committer**

```bash
git add src/ui/avatar.css
git commit -m "feat: add avatar aura CSS animations"
```

---

## Task 2 — Créer `src/ui/avatar.js`

**Files:**
- Create: `src/ui/avatar.js`

- [ ] **Créer le module avec le catalogue AURAS et les helpers**

```js
// ============================================================
// AVATAR MODULE — Aura system
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { appState } from '../services/state.js';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { loadBadges } from '../core/badges.js';
import { rankSettings, getRank } from '../core/ranks.js';
import { getAvgScore } from '../core/scores.js';

// ============================================================
// CATALOGUE
// ============================================================

export const AURAS = [
    // --- Rang ---
    { id: 'acier',    name: 'Acier',    type: 'rank', rankIndex: 0, color: '#7B8FA1', rings: 1 },
    { id: 'azur',     name: 'Azur',     type: 'rank', rankIndex: 1, color: '#4B9CD3', rings: 2 },
    { id: 'braise',   name: 'Braise',   type: 'rank', rankIndex: 2, color: '#E74C3C', rings: 2 },
    { id: 'doree',    name: 'Dorée',    type: 'rank', rankIndex: 3, color: '#FFD700', rings: 3 },
    { id: 'sacree',   name: 'Sacrée',   type: 'rank', rankIndex: 4, color: '#FFFAF0', rings: 3 },
    // --- Spéciales (badge requis = ID du badge au tier Or = _t3, ou Diamant = _t5) ---
    { id: 'flammes',  name: 'Flammes',  type: 'badge', badgeRequired: 'victories_t3', color: '#FF6B35', rings: 1 },
    { id: 'blizzard', name: 'Blizzard', type: 'badge', badgeRequired: 'streak_t3',    color: '#00D4FF', rings: 1 },
    { id: 'foudre',   name: 'Foudre',   type: 'badge', badgeRequired: 'perfect_t3',   color: '#FFFF00', rings: 1 },
    { id: 'ombre',    name: 'Ombre',    type: 'badge', badgeRequired: 'nightowl_t3',  color: '#8B5CF6', rings: 1 },
    { id: 'verdure',  name: 'Verdure',  type: 'badge', badgeRequired: 'habits_t3',    color: '#39FF14', rings: 1 },
    { id: 'celeste',  name: 'Céleste',  type: 'badge', badgeRequired: 'collector_t5', color: '#B9F2FF', rings: 1 },
    { id: 'prestige', name: 'Prestige', type: 'badge', badgeRequired: 'rank_t5',      color: '#FF00FF', rings: 1 },
];

// ============================================================
// HELPERS
// ============================================================

function getCurrentRankIndex() {
    const avgScore = getAvgScore();
    const rank = getRank(avgScore);
    const idx = rankSettings.findIndex(r => r.name === rank.name);
    return idx >= 0 ? idx : 0;
}

export function getUnlockedAuras() {
    const unlockedBadges = loadBadges();
    const rankIndex = getCurrentRankIndex();
    return AURAS.filter(aura => {
        if (aura.type === 'rank')  return aura.rankIndex <= rankIndex;
        if (aura.type === 'badge') return unlockedBadges.includes(aura.badgeRequired);
        return false;
    }).map(a => a.id);
}

export function getActiveAura() {
    const data = getData();
    const profile = data.profile || {};
    const activeId = profile.activeAura || null;
    if (!activeId) return null;
    return AURAS.find(a => a.id === activeId) || null;
}

export function setActiveAura(auraId) {
    const data = getData();
    if (!data.profile) data.profile = {};
    data.profile.activeAura = auraId;
    saveData(data);

    if (isFirebaseConfigured && appState.currentUser) {
        db.collection('users').doc(appState.currentUser.uid)
            .set({ profile: { activeAura: auraId } }, { merge: true })
            .catch(err => console.error('❌ Erreur sync aura:', err));
    }

    closeAuraPicker();
    // Rafraîchir l'avatar sur la page profil si visible
    const profileAvatarEl = document.getElementById('profileAvatarWrap');
    if (profileAvatarEl) {
        profileAvatarEl.outerHTML = renderAvatar({ size: 'large' });
    }
}

// ============================================================
// RENDU HTML
// ============================================================

/**
 * Génère le HTML d'un avatar avec son aura.
 * @param {Object} opts
 * @param {string}  [opts.emoji]   — emoji à afficher (défaut: profil courant)
 * @param {string}  [opts.auraId]  — ID de l'aura (défaut: aura active du profil)
 * @param {'large'|'small'} [opts.size] — taille (défaut: 'large')
 * @param {boolean} [opts.isMaitre] — true si le rang est Maître (pour le chat)
 * @param {string}  [opts.id]       — id HTML du conteneur
 */
export function renderAvatar({ emoji, auraId, size = 'large', isMaitre = false, id = 'profileAvatarWrap' } = {}) {
    const data = getData();
    const profile = data.profile || {};
    const resolvedEmoji = emoji || profile.avatar || '🦁';
    const resolvedAuraId = auraId !== undefined ? auraId : (profile.activeAura || null);
    const aura = resolvedAuraId ? AURAS.find(a => a.id === resolvedAuraId) : null;

    const maitreCls = (size === 'small' && isMaitre) ? ' avatar-wrap--maitre' : '';
    const wrapClass = `avatar-wrap avatar-wrap--${size}${maitreCls}`;

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
        <span class="avatar-emoji">${resolvedEmoji}</span>
    </div>`;
}

// ============================================================
// PICKER
// ============================================================

export function openAuraPicker() {
    const unlockedIds = getUnlockedAuras();
    const activeAura = getActiveAura();

    const rankAuras  = AURAS.filter(a => a.type === 'rank');
    const badgeAuras = AURAS.filter(a => a.type === 'badge');

    function renderPickerItem(aura) {
        const isUnlocked = unlockedIds.includes(aura.id);
        const isActive   = activeAura && activeAura.id === aura.id;

        const activeCls  = isActive   ? ' aura-picker-item--active'  : '';
        const lockedCls  = !isUnlocked ? ' aura-picker-item--locked' : '';
        const onclick    = isUnlocked  ? `onclick="setActiveAura('${aura.id}')"` : '';

        const avatarHtml = renderAvatar({ auraId: aura.id, size: 'small', id: `picker-avatar-${aura.id}` });

        const lockHint = !isUnlocked
            ? `<div class="aura-picker-lock">🔒 ${aura.type === 'rank' ? 'Rang requis' : 'Badge requis'}</div>`
            : '';

        return `<div class="aura-picker-item${activeCls}${lockedCls}" ${onclick}>
            ${avatarHtml}
            <span class="aura-picker-name" style="color:${aura.color};">${aura.name}</span>
            ${lockHint}
        </div>`;
    }

    const html = `
        <div class="aura-picker-section-title">Auras de rang</div>
        <div class="aura-picker-grid">${rankAuras.map(renderPickerItem).join('')}</div>
        <div class="aura-picker-section-title">Auras spéciales (badges)</div>
        <div class="aura-picker-grid">${badgeAuras.map(renderPickerItem).join('')}</div>
    `;

    const grid = document.getElementById('auraPicker');
    if (grid) grid.innerHTML = html;
    document.getElementById('auraPickerModal').classList.add('active');
}

export function closeAuraPicker() {
    const modal = document.getElementById('auraPickerModal');
    if (modal) modal.classList.remove('active');
}
```

- [ ] **Committer**

```bash
git add src/ui/avatar.js
git commit -m "feat: add avatar.js module (AURAS catalog, renderAvatar, picker)"
```

---

## Task 3 — Brancher le CSS dans `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Ajouter le lien CSS avatar** — trouver la ligne `<link rel="stylesheet" href="src/ui/sounds.js">` ou l'un des derniers `<link>` CSS existants, et ajouter juste après :

Chercher dans `index.html` un bloc de `<link rel="stylesheet"`. Ajouter après le dernier :

```html
<link rel="stylesheet" href="src/ui/avatar.css">
```

- [ ] **Remplacer la div `#profileAvatar`** — trouver ce bloc dans `index.html` :

```html
<div class="profile-avatar" id="profileAvatar">🦁</div>
<button class="profile-change-avatar-btn" onclick="openAvatarPicker()">
  Changer l'avatar
</button>
```

Remplacer par :

```html
<div id="profileAvatarWrap" class="avatar-wrap avatar-wrap--large">
    <div></div>
    <span class="avatar-emoji">🦁</span>
</div>
<button class="profile-change-avatar-btn" onclick="openAvatarPicker()">
  Changer l'avatar
</button>
<button class="profile-change-avatar-btn" onclick="openAuraPicker()" style="margin-top:6px;">
  ✦ Changer l'aura
</button>
```

- [ ] **Ajouter la modal Aura Picker** — trouver `<!-- Modal Avatar Picker -->` dans `index.html`, et ajouter juste après le bloc `</div>` qui ferme `avatarPickerModal` :

```html
<!-- Modal Aura Picker -->
<div class="modal-overlay" id="auraPickerModal">
  <div class="modal">
    <h3>✦ CHOISIR UNE AURA</h3>
    <div id="auraPicker">
      <!-- Rempli par avatar.js -->
    </div>
    <div class="modal-buttons">
      <button class="modal-btn cancel" onclick="closeAuraPicker()">Fermer</button>
    </div>
  </div>
</div>
```

- [ ] **Committer**

```bash
git add index.html
git commit -m "feat: add aura picker modal and avatar wrap in profile HTML"
```

---

## Task 4 — Modifier `src/pages/profile.js`

**Files:**
- Modify: `src/pages/profile.js`

- [ ] **Ajouter l'import du module avatar** — au début de `profile.js`, après les imports existants, ajouter :

```js
import { renderAvatar } from '../ui/avatar.js';
```

- [ ] **Mettre à jour `renderProfile()`** — trouver ces 2 lignes dans `renderProfile()` :

```js
const avatarEl = document.getElementById('profileAvatar');
if (avatarEl) avatarEl.textContent = profile.avatar || '🦁';
```

Remplacer par :

```js
const avatarWrapEl = document.getElementById('profileAvatarWrap');
if (avatarWrapEl) {
    avatarWrapEl.outerHTML = renderAvatar({ size: 'large', id: 'profileAvatarWrap' });
}
```

- [ ] **Vérifier dans le navigateur** — ouvrir `index.html` → page Profil. L'emoji doit s'afficher. Si une aura est active dans le profil, son effet doit apparaître autour de l'emoji.

- [ ] **Committer**

```bash
git add src/pages/profile.js
git commit -m "feat: use renderAvatar() in profile page"
```

---

## Task 5 — Exposer les fonctions dans `src/app.js`

**Files:**
- Modify: `src/app.js`

- [ ] **Ajouter l'import** — trouver le bloc d'imports en haut de `app.js`. Ajouter :

```js
import { openAuraPicker, closeAuraPicker, setActiveAura } from './ui/avatar.js';
```

- [ ] **Exposer dans `Object.assign(window, {...})`** — trouver le commentaire `// Profile` dans le bloc `Object.assign(window, {` (aux alentours de la ligne 737) :

```js
// Profile
openAvatarPicker, closeAvatarPicker, selectAvatar,
```

Ajouter après cette ligne :

```js
openAuraPicker, closeAuraPicker, setActiveAura,
```

- [ ] **Vérifier dans le navigateur** — cliquer sur le bouton "✦ Changer l'aura". La modal doit s'ouvrir avec les auras disponibles. Cliquer sur une aura débloquée → la modal se ferme et l'avatar sur le profil se met à jour.

- [ ] **Committer**

```bash
git add src/app.js
git commit -m "feat: expose aura picker functions to window"
```

---

## Task 6 — Modifier `src/ui/chat.js` pour afficher les auras

**Files:**
- Modify: `src/ui/chat.js`

- [ ] **Ajouter l'import** — en haut de `chat.js`, après les imports existants :

```js
import { renderAvatar, AURAS } from '../ui/avatar.js';
import { rankSettings, getRank } from '../core/ranks.js';
```

- [ ] **Inclure `senderAura` lors de l'envoi de messages texte** — trouver le bloc (environ ligne 497) :

```js
const messageData = {
    type: 'text',
    text,
    senderId: appState.currentUser.uid,
    senderPseudo: userData.pseudo || userData.profile?.pseudo || 'Anonyme',
    senderAvatar: userData.avatar || userData.profile?.avatar || '👤',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
};
```

Remplacer par :

```js
const messageData = {
    type: 'text',
    text,
    senderId: appState.currentUser.uid,
    senderPseudo: userData.pseudo || userData.profile?.pseudo || 'Anonyme',
    senderAvatar: userData.avatar || userData.profile?.avatar || '👤',
    senderAura: userData.profile?.activeAura || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
};
```

- [ ] **Faire de même pour les deux blocs audio** — chercher les deux autres occurrences de `senderAvatar: userData.avatar || userData.profile?.avatar || '👤',` dans `chat.js` (environ lignes 937 et 1064) et ajouter `senderAura: userData.profile?.activeAura || null,` juste après chaque occurrence.

- [ ] **Ajouter le helper `isMaitreRank`** — après la fonction `hashStringToColor` (environ ligne 57), ajouter :

```js
function isMaitreRank(avgScore) {
    if (!rankSettings || rankSettings.length === 0) return false;
    const rank = getRank(avgScore || 0);
    return rankSettings.findIndex(r => r.name === rank.name) === rankSettings.length - 1;
}
```

- [ ] **Remplacer l'affichage de l'avatar dans les messages** — trouver (environ ligne 439) :

```js
html += `<div class="chat-bubble-sender-bottom">
    <span class="chat-bubble-avatar">${escapeHtml(msg.senderAvatar || '👤')}</span>
    <span class="chat-bubble-name" style="color: ${senderColor}">${escapeHtml(msg._displayPseudo)}</span>
</div>`;
```

Remplacer par :

```js
const chatAvatarHtml = renderAvatar({
    emoji: msg.senderAvatar || '👤',
    auraId: msg.senderAura || null,
    size: 'small',
    isMaitre: false,
    id: `chat-avatar-${msgId}`,
});
html += `<div class="chat-bubble-sender-bottom">
    ${chatAvatarHtml}
    <span class="chat-bubble-name" style="color: ${senderColor}">${escapeHtml(msg._displayPseudo)}</span>
</div>`;
```

- [ ] **Vérifier dans le navigateur** — ouvrir un groupe avec des messages. Les avatars emoji doivent encore s'afficher. Si un utilisateur a une aura active et envoie un message, son avatar dans le chat doit afficher un glow coloré discret.

- [ ] **Committer**

```bash
git add src/ui/chat.js
git commit -m "feat: display aura in group chat messages"
```

---

## Task 7 — Charger l'aura depuis Firestore au démarrage

**Files:**
- Modify: `src/pages/profile.js`

- [ ] **Mettre à jour `loadProfileFromFirestore()`** — trouver dans `profile.js` :

```js
if (userData.profile) {
    // Sauvegarder aussi en local
    const data = getData();
    data.profile = userData.profile;
    saveData(data);
    return userData.profile;
}
```

Vérifier que `userData.profile.activeAura` sera bien préservé dans cette opération (c'est un champ de l'objet `profile`, donc oui — aucune modification requise si Firestore stocke le champ dans `profile`).

- [ ] **Vérifier** — se connecter avec un compte, changer l'aura, recharger la page. L'aura doit persister (lue depuis localStorage). Se connecter depuis un autre navigateur → l'aura doit être lue depuis Firestore.

- [ ] **Incrémenter le cache PWA** — dans `sw.js`, trouver `const CACHE_NAME = '...'` et incrémenter le numéro de version.

- [ ] **Committer final**

```bash
git add sw.js
git commit -m "feat: avatar aura system complete — bump cache version"
```

---

## Self-Review

**Couverture spec :**
- ✅ Module `src/ui/avatar.js` — Task 2
- ✅ `src/ui/avatar.css` — Task 1
- ✅ Catalogue 5 rangs + 7 spéciales — Task 2 (AURAS)
- ✅ Stockage `profile.activeAura` — Task 2 (`setActiveAura`)
- ✅ Sync Firestore — Task 2 (`setActiveAura`)
- ✅ Picker profil avec verrouillés grisés — Task 2 (`openAuraPicker`)
- ✅ Rendu profil pleine intensité — Task 4
- ✅ Rendu chat discret (statique) — Task 1 (CSS `.avatar-wrap--chat`) + Task 6
- ✅ Exception Maître en chat — Task 1 (CSS `.avatar-wrap--maitre`) + Task 6
- ✅ Exposition `window.*` — Task 5
- ✅ Bump cache SW — Task 7

**Placeholders :** aucun TBD ni "à compléter".

**Cohérence des types :**
- `renderAvatar()` utilisé en Task 2, 4 et 6 avec les mêmes paramètres `{ emoji, auraId, size, isMaitre, id }`
- `setActiveAura(auraId)` défini en Task 2, exposé en Task 5, appelé depuis le picker HTML via `onclick`
- `openAuraPicker` / `closeAuraPicker` cohérents entre Task 2, Task 3 (HTML), Task 5 (window)
- `id="auraPickerModal"` / `id="auraPicker"` cohérents entre Task 3 (HTML) et Task 2 (JS)
