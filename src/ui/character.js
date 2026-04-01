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
