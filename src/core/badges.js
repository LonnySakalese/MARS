// ============================================================
// SYSTÈME DE BADGES D'ACHIEVEMENTS — AVEC RANGS
// ============================================================

import { getData, saveData } from "../services/storage.js";
import { habits, appState } from "../services/state.js";
import { isFirebaseConfigured } from "../config/firebase.js";
import { calculateStats } from "./scores.js";
import { getRank } from "./ranks.js";
import { showPopup } from "../ui/toast.js";
import { triggerConfetti } from "../ui/confetti.js";

// SVG icon helper
const svg = (d, sw = 2) =>
  `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const BADGE_ICONS = {
  footprints: svg(
    '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5 10 7.43 8 8.5 8 10"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 1.93 2 3 2 4.5"/>',
  ),
  flame: svg(
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  ),
  star: svg(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ),
  calendar: svg(
    '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  ),
  trophy: svg(
    '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  ),
  palette: svg(
    '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  ),
  moon: svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
  award: svg(
    '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  ),
  medal: svg(
    '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
  ),
  swords: svg(
    '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="m16 16 2 2"/><path d="M9.5 6.5 21 18v3h-3L6.5 9.5"/>',
  ),
};

// ============================================================
// SYSTÈME DE RANGS PAR BADGE
// ============================================================

// 5 tiers avec couleurs distinctes
export const BADGE_TIERS = [
  { rank: 1, name: "Bronze", color: "#CD7F32" },
  { rank: 2, name: "Argent", color: "#C0C0C0" },
  { rank: 3, name: "Or", color: "#FFD700" },
  { rank: 4, name: "Platine", color: "#E5E4E2" },
  { rank: 5, name: "Diamant", color: "#B9F2FF" },
];

// Badge families — each has 5 tiers with increasing thresholds
export const BADGE_FAMILIES = [
  {
    id: "victories",
    name: "Victoires",
    desc: "Habitudes complétées",
    icon: BADGE_ICONS.flame,
    condition: "totalWins",
    tiers: [1, 50, 200, 500, 2000],
  },
  {
    id: "perfect",
    name: "Perfection",
    desc: "Jours parfaits (100%)",
    icon: BADGE_ICONS.star,
    condition: "perfectDays",
    tiers: [1, 15, 50, 150, 365],
  },
  {
    id: "streak",
    name: "Régularité",
    desc: "Meilleur streak consécutif",
    icon: BADGE_ICONS.calendar,
    condition: "bestStreak",
    tiers: [3, 7, 30, 100, 365],
  },
  {
    id: "habits",
    name: "Architecte",
    desc: "Habitudes créées",
    icon: BADGE_ICONS.palette,
    condition: "customHabits",
    tiers: [1, 3, 5, 8, 12],
  },
  {
    id: "nightowl",
    name: "Noctambule",
    desc: "Validations après 22h",
    icon: BADGE_ICONS.moon,
    condition: "lateValidations",
    tiers: [1, 7, 30, 100, 250],
  },
  {
    id: "rank",
    name: "Prestige",
    desc: "Jours au rang Maître",
    icon: BADGE_ICONS.trophy,
    condition: "rankMasterDays",
    tiers: [1, 7, 30, 90, 365],
  },
  {
    id: "collector",
    name: "Collectionneur",
    desc: "Badges au rang Or+",
    icon: BADGE_ICONS.award,
    condition: "goldBadges",
    tiers: [1, 2, 4, 6, 8],
  },
];

// Legacy BADGES array — kept for backward compat (profile, admin, etc.)
// Now generated from families
export const BADGES = [];
BADGE_FAMILIES.forEach((fam) => {
  BADGE_TIERS.forEach((tier, i) => {
    BADGES.push({
      id: `${fam.id}_t${tier.rank}`,
      familyId: fam.id,
      name: `${fam.name} ${tier.name}`,
      desc: `${fam.desc} : ${fam.tiers[i]}`,
      icon: fam.icon,
      condition: fam.condition,
      value: fam.tiers[i],
      rarity: ["common", "uncommon", "rare", "epic", "legendary"][i],
      tierRank: tier.rank,
      tierColor: tier.color,
      tierName: tier.name,
    });
  });
});

// Couleurs des raretés (legacy compat)
export const RARITY_COLORS = {
  common: "#CD7F32",
  uncommon: "#C0C0C0",
  rare: "#FFD700",
  epic: "#E5E4E2",
  legendary: "#B9F2FF",
};

// ============================================================
// STORAGE
// ============================================================

export function loadBadges() {
  const data = getData();
  return data.unlockedBadges || [];
}

export function saveBadges(unlockedBadges) {
  const data = getData();
  data.unlockedBadges = unlockedBadges;
  saveData(data);

  if (isFirebaseConfigured && appState.currentUser) {
    syncBadgesToFirestore(unlockedBadges);
  }
}

async function syncBadgesToFirestore(unlockedBadges) {
  if (!isFirebaseConfigured || !appState.currentUser) return;
  try {
    const userRef = firebase
      .firestore()
      .collection("users")
      .doc(appState.currentUser.uid);
    await userRef.set({ unlockedBadges }, { merge: true });
  } catch (error) {
    console.error("❌ Erreur sync badges:", error);
  }
}

// ============================================================
// HELPER: Get current tier for a family
// ============================================================

export function getFamilyTier(familyId, unlockedBadges) {
  let maxTier = 0;
  for (let t = 5; t >= 1; t--) {
    if (unlockedBadges.includes(`${familyId}_t${t}`)) {
      maxTier = t;
      break;
    }
  }
  return maxTier; // 0 = locked, 1-5 = tier
}

// ============================================================
// CHECK & UNLOCK
// ============================================================

export function checkAndUnlockBadges() {
  try {
    const data = getData();
    const stats = calculateStats();
    const unlockedBadges = loadBadges();
    const newlyUnlocked = [];

    const values = {
      totalWins: stats.totalWins || 0,
      perfectDays: stats.perfectDaysCount || 0,
      bestStreak: stats.bestStreak || 0,
      customHabits: (data.customHabits || []).length,
      lateValidations: data.lateValidations || 0,
      rankMasterDays: data.rankMasterDays || 0,
    };

    // Count gold+ badges for collector
    let goldCount = 0;
    BADGE_FAMILIES.forEach((fam) => {
      if (fam.id === "collector") return;
      const tier = getFamilyTier(fam.id, unlockedBadges);
      if (tier >= 3) goldCount++;
    });
    values.goldBadges = goldCount;

    BADGES.forEach((badge) => {
      if (unlockedBadges.includes(badge.id)) return;
      const current = values[badge.condition] || 0;
      if (current >= badge.value) {
        unlockedBadges.push(badge.id);
        newlyUnlocked.push(badge);
      }
    });

    if (newlyUnlocked.length > 0) {
      saveBadges(unlockedBadges);
      newlyUnlocked.forEach((badge) => showBadgeUnlockNotification(badge));
    }

    return newlyUnlocked;
  } catch (error) {
    console.error("❌ Error checking badges:", error);
    return [];
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export function showBadgeUnlockNotification(badge) {
  if (["rare", "epic", "legendary"].includes(badge.rarity)) {
    triggerConfetti();
  }
  const tierLabel = badge.tierName || "";
  // Use new badge notification system that groups multiple badges
  showPopup(`${badge.name} ${tierLabel}`, "badge");
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

// ============================================================
// TOGGLE VISIBILITY
// ============================================================

export function toggleBadgesVisibility() {
  const grid = document.getElementById("badgesGridWrapper");
  const btn = document.getElementById("toggleBadgesBtn");
  if (!grid || !btn) return;
  const isHidden = grid.style.display === "none";
  grid.style.display = isHidden ? "block" : "none";
  btn.querySelector("span").textContent = isHidden
    ? "Masquer les badges"
    : "Voir les badges";
}

// ============================================================
// HELPER: Get all current values
// ============================================================

function getCurrentValues(unlockedBadges) {
  try {
    const data = getData();
    const stats = calculateStats();
    const vals = {
      totalWins: stats.totalWins || 0,
      perfectDays: stats.perfectDaysCount || 0,
      bestStreak: stats.bestStreak || 0,
      customHabits: (data.customHabits || []).length,
      lateValidations: data.lateValidations || 0,
      rankMasterDays: data.rankMasterDays || 0,
      goldBadges: 0,
    };
    BADGE_FAMILIES.forEach((f) => {
      if (f.id === "collector") return;
      if (getFamilyTier(f.id, unlockedBadges) >= 3) vals.goldBadges++;
    });
    return vals;
  } catch (e) {
    return {};
  }
}

// ============================================================
// DETAIL MODAL — tap a badge to see all tiers
// ============================================================

export function showBadgeDetail(familyId) {
  const fam = BADGE_FAMILIES.find((f) => f.id === familyId);
  if (!fam) return;

  const unlockedBadges = loadBadges();
  const currentTier = getFamilyTier(familyId, unlockedBadges);
  const vals = getCurrentValues(unlockedBadges);
  const currentValue = vals[fam.condition] || 0;

  // Build tier rows
  let tiersHtml = "";
  BADGE_TIERS.forEach((tier, i) => {
    const threshold = fam.tiers[i];
    const isAchieved = i < currentTier;
    const isCurrent = i === currentTier - 1;
    const isNext = i === currentTier;

    // Progress for this specific tier
    let pct = 0;
    if (isAchieved) {
      pct = 100;
    } else if (isNext) {
      const prev = i > 0 ? fam.tiers[i - 1] : 0;
      const range = threshold - prev;
      pct =
        range > 0
          ? Math.min(100, Math.round(((currentValue - prev) / range) * 100))
          : 0;
    }

    const checkIcon = svg('<polyline points="20 6 9 17 4 12"/>', 2.5);

    tiersHtml += `
            <div class="bdm-tier-row ${isAchieved ? "achieved" : ""} ${isCurrent ? "current" : ""} ${isNext ? "next" : ""}">
                <div class="bdm-tier-dot" style="${isAchieved ? `background: ${tier.color}; box-shadow: 0 0 8px ${tier.color};` : ""}">
                    ${isAchieved ? `<span style="color: #000; display: flex;">${checkIcon}</span>` : ""}
                </div>
                <div class="bdm-tier-info">
                    <div class="bdm-tier-name" style="${isAchieved || isCurrent ? `color: ${tier.color};` : ""}">${tier.name}</div>
                    <div class="bdm-tier-threshold">${fam.desc} : ${threshold}</div>
                    ${
                      isNext
                        ? `
                        <div class="bdm-tier-progress">
                            <div class="bdm-tier-bar">
                                <div class="bdm-tier-fill" style="width: ${pct}%; background: ${tier.color};"></div>
                            </div>
                            <span class="bdm-tier-pct">${currentValue} / ${threshold}</span>
                        </div>
                    `
                        : ""
                    }
                </div>
                ${isAchieved ? `<div class="bdm-tier-check" style="color: ${tier.color};">${checkIcon}</div>` : ""}
            </div>
        `;
  });

  // Remove existing modal if any
  const old = document.getElementById("badgeDetailModal");
  if (old) old.remove();

  const tierInfo = currentTier > 0 ? BADGE_TIERS[currentTier - 1] : null;
  const tierColor = tierInfo ? tierInfo.color : "var(--steel)";
  const tierName = tierInfo ? tierInfo.name : "Aucun rang";

  const modal = document.createElement("div");
  modal.id = "badgeDetailModal";
  modal.className = "bdm-overlay";
  modal.innerHTML = `
        <div class="bdm-modal">
            <button class="bdm-close" onclick="document.getElementById('badgeDetailModal').remove()">
                ${svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')}
            </button>
            <div class="bdm-header">
                <div class="bdm-icon" style="color: ${tierColor}; ${currentTier > 0 ? `filter: drop-shadow(0 0 12px ${tierColor});` : "opacity: 0.3;"}">
                    ${fam.icon}
                </div>
                <div class="bdm-title">${fam.name}</div>
                <div class="bdm-rank" style="color: ${tierColor};">${tierName}</div>
                <div class="bdm-value">${currentValue} ${fam.desc.toLowerCase()}</div>
            </div>
            <div class="bdm-tiers">
                ${tiersHtml}
            </div>
        </div>
    `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

// Make it available globally for onclick
window.showBadgeDetail = showBadgeDetail;

// ============================================================
// RENDER — Badge cards grouped by family with tier progress
// ============================================================

export function renderBadges() {
  try {
    const container = document.getElementById("badgesContainer");
    if (!container) return;

    const unlockedBadges = loadBadges();

    // Count total unlocked
    const totalUnlocked = unlockedBadges.length;
    const totalPossible = BADGES.length;
    const progress = Math.round((totalUnlocked / totalPossible) * 100);

    let html = `
            <div class="badges-header">
                <div class="badges-title">
                    ${svg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>', 2)}
                    RÉALISATIONS
                </div>
                <div class="badges-progress">
                    <span>${totalUnlocked} / ${totalPossible}</span>
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
            <button id="toggleBadgesBtn" class="action-btn action-btn-secondary" onclick="toggleBadgesVisibility()" style="width: 100%; margin-bottom: 10px;">
                ${svg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>', 2)}
                <span>Voir les badges</span>
            </button>
            <div id="badgesGridWrapper" style="display: none;">
                <div class="badges-families">
        `;

    BADGE_FAMILIES.forEach((fam) => {
      const currentTier = getFamilyTier(fam.id, unlockedBadges);
      const tierInfo = currentTier > 0 ? BADGE_TIERS[currentTier - 1] : null;
      const tierColor = tierInfo ? tierInfo.color : "var(--steel)";
      const tierName = tierInfo ? tierInfo.name : "Verrouillé";

      // Next tier info
      const nextTierIdx = currentTier; // 0-based index for next
      const nextThreshold = nextTierIdx < 5 ? fam.tiers[nextTierIdx] : null;

      // Get current value for progress
      const allVals = getCurrentValues(unlockedBadges);
      const currentValue = allVals[fam.condition] || 0;

      // Progress bar toward next tier
      let progressPct = 0;
      let progressLabel = "";
      if (nextThreshold !== null) {
        const prevThreshold = currentTier > 0 ? fam.tiers[currentTier - 1] : 0;
        const range = nextThreshold - prevThreshold;
        const done = Math.min(currentValue - prevThreshold, range);
        progressPct = range > 0 ? Math.round((done / range) * 100) : 0;
        progressLabel = `${currentValue} / ${nextThreshold}`;
      } else {
        progressPct = 100;
        progressLabel = "MAX";
      }

      // Tier dots
      let dotsHtml = "";
      for (let t = 0; t < 5; t++) {
        const isAchieved = t < currentTier;
        const dotColor = BADGE_TIERS[t].color;
        dotsHtml += `<div class="badge-tier-dot ${isAchieved ? "achieved" : ""}" style="${isAchieved ? `background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};` : ""}"></div>`;
      }

      html += `
                <div class="badge-family-card" onclick="showBadgeDetail('${fam.id}')" style="border-color: ${tierColor}; cursor: pointer;">
                    <div class="badge-family-top" style="background: ${tierColor}20;"></div>
                    <div class="badge-family-icon" style="color: ${tierColor}; ${currentTier > 0 ? `filter: drop-shadow(0 0 8px ${tierColor});` : "opacity: 0.3; filter: grayscale(100%);"}">
                        ${fam.icon}
                    </div>
                    <div class="badge-family-name">${fam.name}</div>
                    <div class="badge-family-tier" style="color: ${tierColor};">${tierName}</div>
                    <div class="badge-tier-dots">${dotsHtml}</div>
                    <div class="badge-family-desc">${fam.desc}</div>
                    <div class="badge-family-progress">
                        <div class="badge-progress-bar">
                            <div class="badge-progress-fill" style="width: ${progressPct}%; background: ${tierColor};"></div>
                        </div>
                        <div class="badge-progress-label">${progressLabel}</div>
                    </div>
                </div>
            `;
    });

    html += "</div></div>";
    container.innerHTML = html;
  } catch (error) {
    console.error("❌ Error rendering badges:", error);
  }
}
