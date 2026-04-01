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
