// ============================================================
// PAGE PROFIL - Profil utilisateur
// ============================================================

import { appState } from '../services/state.js';
import { getData, saveData } from '../services/storage.js';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { getAvgScore, getBestStreak, getPerfectDays } from '../core/scores.js';
import { getRank } from '../core/ranks.js';
import { showPopup } from '../ui/toast.js';
import { validatePseudo } from '../services/pseudo-validator.js';
import { loadBadges, BADGES } from '../core/badges.js';
import { renderAvatar } from '../ui/avatar.js';

// --- PROFILE DATA ---

export function getProfile() {
    const data = getData();
    return data.profile || { pseudo: '', avatar: '🦁' };
}

export function saveProfile(profile) {
    const data = getData();
    data.profile = profile;
    saveData(data);

    // Sync avec Firestore si connecté
    if (isFirebaseConfigured && appState.currentUser) {
        syncProfileToFirestore(profile);
    }
}

async function syncProfileToFirestore(profile) {
    if (!isFirebaseConfigured || !appState.currentUser) return;

    try {
        const userRef = db.collection('users').doc(appState.currentUser.uid);
        await userRef.set({
            profile: profile,
            pseudo: profile.pseudo || null,
            avatar: profile.avatar || null,
        }, { merge: true });
        console.log('✅ Profil synchronisé avec Firestore');
    } catch (error) {
        console.error('❌ Erreur sync profil:', error);
    }
}

export async function loadProfileFromFirestore() {
    if (!isFirebaseConfigured || !appState.currentUser) return null;

    try {
        const userRef = db.collection('users').doc(appState.currentUser.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.profile) {
                // Sauvegarder aussi en local
                const data = getData();
                data.profile = userData.profile;
                saveData(data);
                return userData.profile;
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement profil Firestore:', error);
    }
    return null;
}

// --- RENDER ---

export function renderProfile() {
    const profile = getProfile();

    // Avatar
    const avatarWrapEl = document.getElementById('profileAvatarWrap');
    if (avatarWrapEl) {
        avatarWrapEl.outerHTML = renderAvatar({ size: 'large', id: 'profileAvatarWrap' });
    }

    // Pseudo
    const pseudoEl = document.getElementById('profilePseudo');
    if (pseudoEl) pseudoEl.textContent = profile.pseudo || '-';

    // Stats
    const avgScore = getAvgScore();
    const rank = getRank(avgScore);

    const avgScoreEl = document.getElementById('profileAvgScore');
    if (avgScoreEl) avgScoreEl.textContent = avgScore + '%';

    const bestStreakEl = document.getElementById('profileBestStreak');
    if (bestStreakEl) bestStreakEl.textContent = getBestStreak();

    const perfectDaysEl = document.getElementById('profilePerfectDays');
    if (perfectDaysEl) perfectDaysEl.textContent = getPerfectDays();

    const rankEl = document.getElementById('profileRank');
    if (rankEl) {
        rankEl.textContent = rank.name;
        // Ensure rank color is visible on dark bg (lighten if too dark)
        let color = rank.color;
        if (color) {
            const r = parseInt(color.slice(1,3), 16) || 0;
            const g = parseInt(color.slice(3,5), 16) || 0;
            const b = parseInt(color.slice(5,7), 16) || 0;
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
            if (luminance < 80) {
                // Too dark — use a lighter version
                color = `rgb(${Math.min(255, r + 120)}, ${Math.min(255, g + 120)}, ${Math.min(255, b + 120)})`;
            }
        }
        rankEl.style.color = color;
    }

    // Stats fun
    const data = getData();
    let totalChecked = 0;
    if (data.days) {
        for (const key in data.days) {
            totalChecked += Object.values(data.days[key]).filter(Boolean).length;
        }
    }
    const totalCheckedEl = document.getElementById('profileTotalChecked');
    if (totalCheckedEl) totalCheckedEl.textContent = totalChecked;

    const daysTracked = data.days ? Object.keys(data.days).length : 0;
    const daysTrackedEl = document.getElementById('profileDaysTracked');
    if (daysTrackedEl) daysTrackedEl.textContent = daysTracked;

    let firstTrackDate = '-';
    if (data.days && Object.keys(data.days).length > 0) {
        const sortedKeys = Object.keys(data.days).sort();
        const firstKey = sortedKeys[0];
        const [y, m, d] = firstKey.split('-');
        firstTrackDate = `${d}/${m}/${y.slice(2)}`;
    }
    const firstTrackDateEl = document.getElementById('profileFirstTrackDate');
    if (firstTrackDateEl) firstTrackDateEl.textContent = firstTrackDate;

    // Membre depuis
    const memberSinceEl = document.getElementById('profileMemberSince');
    if (memberSinceEl) {
        if (isFirebaseConfigured && appState.currentUser) {
            const creationTime = appState.currentUser.metadata?.creationTime;
            if (creationTime) {
                const date = new Date(creationTime);
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                memberSinceEl.textContent = `Membre depuis ${months[date.getMonth()]} ${date.getFullYear()}`;
            }
        } else {
            memberSinceEl.textContent = '';
        }
    }
}

// --- EDIT PSEUDO ---

export function openEditPseudoModal() {
    const profile = getProfile();
    document.getElementById('editPseudoInput').value = profile.pseudo || '';
    document.getElementById('editPseudoModal').classList.add('active');
}

export function closeEditPseudoModal() {
    document.getElementById('editPseudoModal').classList.remove('active');
}

export function saveProfilePseudo() {
    const input = document.getElementById('editPseudoInput');
    const pseudo = input.value.trim();

    // Validation anti-toxicité
    const validation = validatePseudo(pseudo);
    if (!validation.is_valid) {
        let msg = validation.reason;
        if (validation.suggested_alternatives.length > 0) {
            msg += '\n💡 Suggestions : ' + validation.suggested_alternatives.join(', ');
        }
        showPopup(msg, 'warning');
        return;
    }

    const profile = getProfile();
    profile.pseudo = pseudo;
    saveProfile(profile);

    closeEditPseudoModal();
    renderProfile();

    if (navigator.vibrate) navigator.vibrate([30, 30]);
    showPopup(`Pseudo mis à jour : ${pseudo}`, 'success');
}

// --- SETUP PSEUDO (après inscription) ---

export function checkNeedsPseudo() {
    const profile = getProfile();
    return !profile.pseudo;
}

export function showSetupPseudoModal() {
    document.getElementById('setupPseudoModal').classList.add('active');
}

export function saveSetupPseudo() {
    const input = document.getElementById('setupPseudoInput');
    const pseudo = input.value.trim();

    if (!pseudo) {
        showPopup('Choisis un pseudo pour continuer !', 'warning');
        return;
    }

    // Validation anti-toxicité
    const validation = validatePseudo(pseudo);
    if (!validation.is_valid) {
        let msg = validation.reason;
        if (validation.suggested_alternatives.length > 0) {
            msg += '\n💡 Suggestions : ' + validation.suggested_alternatives.join(', ');
        }
        showPopup(msg, 'warning');
        return;
    }

    const profile = getProfile();
    profile.pseudo = pseudo;
    if (!profile.avatar) profile.avatar = '🦁';
    saveProfile(profile);

    document.getElementById('setupPseudoModal').classList.remove('active');
    renderProfile();

    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    showPopup(`Bienvenue ${pseudo} !`, 'success');

    // Lancer le tour guidé après le pseudo
    setTimeout(() => {
        if (typeof window.needsGuidedTour === 'function' && window.needsGuidedTour()) {
            window.startGuidedTour();
        }
    }, 800);
}
