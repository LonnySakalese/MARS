// ============================================================
// SYSTÈME DE RANGS PERSONNALISABLES
// ============================================================

import { getData, saveData } from "../services/storage.js";
import { showPopup } from "../ui/toast.js";
import { ConfirmModal } from "../ui/modals.js";

// State
export let rankSettings = [];
export let isRankEditMode = false;
let rankSettingsBackup = [];
export let selectedPaletteId = "samourai";
let selectedPaletteIdBackup = "samourai";

// Callback for when ranks change (set by app.js to trigger updateStats)
let _onRanksChanged = null;
export function setOnRanksChanged(callback) {
  _onRanksChanged = callback;
}

// Les 7 palettes de couleurs prédéfinies
export const colorPalettes = [
  {
    id: "monochrome",
    name: "Thème Principal",
    colors: ["#4A4A45", "#6A6A65", "#9A9A95", "#C5C5C0", "#F5F5F0"],
  },
  {
    id: "or-bronze",
    name: "Or & Bronze",
    colors: ["#8B5A2B", "#CD853F", "#C0C0C0", "#DAA520", "#FFD700"],
  },
  {
    id: "feu-glace",
    name: "Feu & Glace",
    colors: ["#5B7C99", "#48D1CC", "#BFFF00", "#FF6B35", "#FF2D2D"],
  },
  {
    id: "neon",
    name: "Néon Cyberpunk",
    colors: ["#5C4B8A", "#00D4FF", "#39FF14", "#FFFF00", "#FF00FF"],
  },
  {
    id: "nature",
    name: "Nature & Terre",
    colors: ["#6B4423", "#8B9A6B", "#228B22", "#87CEEB", "#FFB347"],
  },
  {
    id: "pastel",
    name: "Minimaliste Pastel",
    colors: ["#A8D8EA", "#AA96DA", "#FCBAD3", "#FF9AA2", "#FFDAC1"],
  },
  {
    id: "samourai",
    name: "Guerrier Samouraï",
    colors: ["#7B8FA1", "#4B9CD3", "#E74C3C", "#FFD700", "#FFFAF0"],
  },
];

// Charge les rangs par défaut avec la palette sélectionnée
export function loadDefaultRanks() {
  const palette =
    colorPalettes.find((p) => p.id === selectedPaletteId) || colorPalettes[6];
  return [
    { id: "debutant", name: "DÉBUTANT", minScore: 0, color: palette.colors[0] },
    {
      id: "apprenti",
      name: "APPRENTI",
      minScore: 31,
      color: palette.colors[1],
    },
    {
      id: "confirme",
      name: "CONFIRMÉ",
      minScore: 51,
      color: palette.colors[2],
    },
    { id: "expert", name: "EXPERT", minScore: 71, color: palette.colors[3] },
    {
      id: "maitre",
      name: "MAÎTRE",
      minScore: 86,
      color: palette.colors[4],
      isTop: true,
    },
  ];
}

// Applique une palette de couleurs aux rangs
export function applyPaletteToRanks(paletteId) {
  const palette = colorPalettes.find((p) => p.id === paletteId);
  if (!palette) return;

  selectedPaletteId = paletteId;
  rankSettings.forEach((rank, index) => {
    if (index < palette.colors.length) {
      rank.color = palette.colors[index];
    }
  });
}

// Charge les paramètres de rangs depuis le stockage
export function loadRankSettings() {
  const data = getData();
  if (
    data.rankSettings &&
    Array.isArray(data.rankSettings) &&
    data.rankSettings.length > 0
  ) {
    rankSettings.length = 0;
    data.rankSettings.forEach((r) => rankSettings.push(r));
    selectedPaletteId = data.selectedPaletteId || "samourai";
    console.log("✅ Rangs personnalisés chargés:", rankSettings.length);
  } else {
    const defaults = loadDefaultRanks();
    rankSettings.length = 0;
    defaults.forEach((r) => rankSettings.push(r));
    console.log("📋 Rangs par défaut chargés");
  }
  rankSettings.sort((a, b) => a.minScore - b.minScore);
}

// Sauvegarde les paramètres de rangs
export function saveRankSettingsToStorage() {
  const data = getData();
  data.rankSettings = rankSettings;
  data.selectedPaletteId = selectedPaletteId;
  saveData(data);
  console.log("💾 Rangs sauvegardés");
}

// Calcule la plage de score pour un rang donné
export function getRankScoreRange(index) {
  const rank = rankSettings[index];
  const nextRank = rankSettings[index + 1];
  const minScore = rank.minScore;
  const maxScore = nextRank ? nextRank.minScore - 1 : 100;
  return { min: minScore, max: maxScore };
}

// Détermine le rang de l'utilisateur en fonction de son score moyen
export function getRank(score) {
  if (rankSettings.length === 0) {
    loadRankSettings();
  }

  for (let i = rankSettings.length - 1; i >= 0; i--) {
    if (score >= rankSettings[i].minScore) {
      return {
        name: rankSettings[i].name,
        color: rankSettings[i].color,
      };
    }
  }

  if (rankSettings.length > 0) {
    return {
      name: rankSettings[0].name,
      color: rankSettings[0].color,
    };
  }

  return { name: "DÉBUTANT", color: "#7B8FA1" };
}

// Génère l'aperçu d'une palette
export function renderPalettePreview(palette) {
  return palette.colors
    .map(
      (color) =>
        `<span class="palette-color-dot" style="background: ${color};"></span>`,
    )
    .join("");
}

// Rendu dynamique de la liste des rangs
export function renderRanks(isEditing = false) {
  const container = document.getElementById("ranksContainer");
  if (!container) return;

  if (rankSettings.length === 0) {
    loadRankSettings();
  }

  let html = "";

  if (isEditing) {
    html += `
            <div class="palette-selector">
                <div class="palette-selector-header">
                    <span class="palette-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></span>
                    <span class="palette-label">PALETTE DE COULEURS</span>
                </div>
                <div class="palette-grid" id="paletteGrid">
                    ${colorPalettes
                      .map(
                        (palette) => `
                        <div class="palette-card ${palette.id === selectedPaletteId ? "selected" : ""}"
                             onclick="onPaletteChange('${palette.id}')"
                             data-palette-id="${palette.id}">
                            <div class="palette-card-colors">
                                ${palette.colors
                                  .map(
                                    (color) => `
                                    <span class="palette-card-dot" style="background: ${color};"></span>
                                `,
                                  )
                                  .join("")}
                            </div>
                            <div class="palette-card-name">${palette.name}</div>
                            ${palette.id === "samourai" ? `<span class="palette-recommended"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>` : ""}
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  rankSettings.forEach((rank, index) => {
    const range = getRankScoreRange(index);
    const isTopRank = rank.isTop || index === rankSettings.length - 1;

    if (isEditing) {
      html += `
                <div class="stat-card rank-edit-card" style="margin-bottom: 10px; border-color: ${rank.color};">
                    <div class="rank-edit-row">
                        <span class="rank-color-preview" style="background: ${rank.color};"></span>
                        <input type="text"
                            class="rank-name-input"
                            value="${rank.name}"
                            data-rank-id="${rank.id}"
                            data-field="name"
                            placeholder="Nom du rang"
                            style="color: ${rank.color}; border-color: ${rank.color};">
                        <div class="rank-score-fixed" style="color: ${rank.color};">
                            ${range.min}-${range.max}%
                        </div>
                    </div>
                </div>
            `;
    } else {
      const bgStyle = isTopRank ? `background: ${rank.color};` : "";
      const textColor = isTopRank ? "var(--black)" : rank.color;

      html += `
                <div class="stat-card" style="margin-bottom: 10px; border-color: ${rank.color}; ${bgStyle}">
                    <div style="color: ${textColor}; font-weight: bold;">${rank.name}</div>
                    <div style="color: ${textColor}; font-size: 0.7rem;">${range.min}-${range.max}%</div>
                </div>
            `;
    }
  });

  container.innerHTML = html;
}

// Gère le changement de palette
export function onPaletteChange(paletteId) {
  applyPaletteToRanks(paletteId);

  document.querySelectorAll(".palette-card").forEach((card) => {
    if (card.dataset.paletteId === paletteId) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  renderRanks(true);

  if (navigator.vibrate) navigator.vibrate(20);
}

// Active/désactive le mode édition des rangs
export function toggleRankEditMode() {
  isRankEditMode = !isRankEditMode;

  const editBtn = document.getElementById("editRanksBtn");
  const editButtons = document.getElementById("rankEditButtons");

  if (isRankEditMode) {
    rankSettingsBackup = JSON.parse(JSON.stringify(rankSettings));
    selectedPaletteIdBackup = selectedPaletteId;
    editBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
    editBtn.title = "Mode édition actif";
    editButtons.style.display = "flex";
    renderRanks(true);
  } else {
    editBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    editBtn.title = "Modifier les rangs";
    editButtons.style.display = "none";
    renderRanks(false);
  }
}

// Annule l'édition des rangs
export function cancelRankEdit() {
  rankSettings.length = 0;
  JSON.parse(JSON.stringify(rankSettingsBackup)).forEach((r) =>
    rankSettings.push(r),
  );
  selectedPaletteId = selectedPaletteIdBackup;
  isRankEditMode = false;

  const editBtn = document.getElementById("editRanksBtn");
  const editButtons = document.getElementById("rankEditButtons");

  editBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  editButtons.style.display = "none";
  renderRanks(false);

  showPopup("Modifications annulées", "info");
}

// Sauvegarde les paramètres de rangs depuis les inputs
export function saveRankSettings() {
  const nameInputs = document.querySelectorAll(".rank-name-input");

  let hasError = false;

  const palette = colorPalettes.find((p) => p.id === selectedPaletteId);

  nameInputs.forEach((input, index) => {
    const name = input.value.trim().toUpperCase();

    if (!name) {
      showPopup(`Le nom du rang ${index + 1} est requis`, "warning");
      hasError = true;
      return;
    }

    rankSettings[index].name = name;
    rankSettings[index].color = palette
      ? palette.colors[index]
      : rankSettings[index].color;
  });

  if (hasError) return;

  if (rankSettings.length > 0) {
    rankSettings.forEach((r, i) => (r.isTop = i === rankSettings.length - 1));
  }

  saveRankSettingsToStorage();

  isRankEditMode = false;
  const editBtn = document.getElementById("editRanksBtn");
  const editButtons = document.getElementById("rankEditButtons");

  editBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  editButtons.style.display = "none";
  renderRanks(false);

  // Trigger stats update via callback (avoids circular dependency)
  if (_onRanksChanged) _onRanksChanged();

  if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
  showPopup("Rangs personnalisés sauvegardés !", "success");
}

// Ouvre une modal affichant tous les rangs avec le rang actuel mis en surbrillance
export function openRanksModal() {
  const avgScoreEl = document.getElementById("avgScore");
  const avgScore = avgScoreEl ? parseInt(avgScoreEl.textContent) || 0 : 0;
  const currentRank = getRank(avgScore);

  if (rankSettings.length === 0) loadRankSettings();

  const palette =
    colorPalettes.find((p) => p.id === selectedPaletteId) || colorPalettes[6];

  let ranksHtml = rankSettings
    .map((rank, index) => {
      const range = getRankScoreRange(index);
      const isCurrent = rank.name === currentRank.name;
      const isTop = rank.isTop || index === rankSettings.length - 1;

      return `
            <div class="ranks-modal-item ${isCurrent ? "ranks-modal-current" : ""}" style="--rank-color: ${rank.color};">
                <div class="ranks-modal-icon">
                    ${isCurrent ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<div class="ranks-modal-dot"></div>'}
                </div>
                <div class="ranks-modal-info">
                    <div class="ranks-modal-name" style="color: ${rank.color};">${rank.name}</div>
                    <div class="ranks-modal-range">${range.min}% — ${range.max}%</div>
                </div>
            </div>
        `;
    })
    .join("");

  // Create modal
  const overlay = document.createElement("div");
  overlay.className = "ranks-modal-overlay";
  overlay.innerHTML = `
        <div class="ranks-modal">
            <div class="ranks-modal-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>TOUS LES RANGS</span>
            </div>
            <div class="ranks-modal-list">
                ${ranksHtml}
            </div>
            <button class="ranks-modal-close" onclick="closeRanksModal()">Fermer</button>
        </div>
    `;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeRanksModal();
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("active"));

  if (navigator.vibrate) navigator.vibrate(20);
}

// Ferme la modal des rangs
export function closeRanksModal() {
  const overlay = document.querySelector(".ranks-modal-overlay");
  if (overlay) {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 300);
  }
}

// Réinitialiser les rangs par défaut
export async function resetRanksToDefault() {
  const confirmed = await ConfirmModal.show({
    title: "RÉINITIALISER LES RANGS",
    message: "Remettre les rangs par défaut ?",
    confirmText: "Réinitialiser",
    cancelText: "Annuler",
  });

  if (confirmed) {
    const defaults = loadDefaultRanks();
    rankSettings.length = 0;
    defaults.forEach((r) => rankSettings.push(r));
    saveRankSettingsToStorage();
    renderRanks(false);
    if (_onRanksChanged) _onRanksChanged();
    showPopup("Rangs réinitialisés", "success");
  }
}
