// ============================================================
// AVATAR MODULE — Aura system
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { appState } from '../services/state.js';
import { db, isFirebaseConfigured } from '../config/firebase.js';
import { loadBadges } from '../core/badges.js';
import { rankSettings, getRank } from '../core/ranks.js';
import { getAvgScore } from '../core/scores.js';
import { renderCharacter, getAvatarConfig, DEFAULT_CONFIG } from './character.js';

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
    // --- Spéciales (badge requis) ---
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

// ============================================================
// PICKER
// ============================================================

export function openAuraPicker() {
    const unlockedIds = getUnlockedAuras();
    const activeAura  = getActiveAura();

    const rankAuras  = AURAS.filter(a => a.type === 'rank');
    const badgeAuras = AURAS.filter(a => a.type === 'badge');

    function renderPickerItem(aura) {
        const isUnlocked = unlockedIds.includes(aura.id);
        const isActive   = activeAura && activeAura.id === aura.id;

        const activeCls = isActive    ? ' aura-picker-item--active' : '';
        const lockedCls = !isUnlocked ? ' aura-picker-item--locked' : '';
        const onclick   = isUnlocked  ? `onclick="setActiveAura('${aura.id}')"` : '';

        const avatarHtml = renderAvatar({
            auraId: aura.id,
            size: 'small',
            id: `picker-avatar-${aura.id}`,
        });

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
