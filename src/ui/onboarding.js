// ============================================================
// ONBOARDING - Guide pour créer ses premières habitudes
// ============================================================

import { habits } from "../services/state.js";
import { getData, saveData } from "../services/storage.js";

// Templates d'habitudes populaires
const HABIT_TEMPLATES = [
  {
    id: "tpl_douche",
    name: "DOUCHE FROIDE",
    icon: "🧊",
    color: "#87CEEB",
    category: "sante",
    description: "Douche froide chaque matin",
  },
  {
    id: "tpl_lecture",
    name: "LECTURE 30MIN",
    icon: "📚",
    color: "#FFD700",
    category: "apprentissage",
    description: "30 minutes de lecture par jour",
  },
  {
    id: "tpl_nutrition",
    name: "NUTRITION CLEAN",
    icon: "🥗",
    color: "#90EE90",
    category: "sante",
    description: "Manger sainement",
  },
  {
    id: "tpl_sport",
    name: "SPORT",
    icon: "💪",
    color: "#FF6B6B",
    category: "sport",
    description: "Séance de sport quotidienne",
  },
  {
    id: "tpl_sommeil",
    name: "SOMMEIL 8H+",
    icon: "😴",
    color: "#9370DB",
    category: "sante",
    description: "8 heures de sommeil minimum",
  },
  {
    id: "tpl_hydratation",
    name: "HYDRATATION 2L",
    icon: "💧",
    color: "#4682B4",
    category: "sante",
    description: "Boire au moins 2 litres d'eau",
  },
  {
    id: "tpl_reveil",
    name: "RÉVEIL TÔT",
    icon: "⏰",
    color: "#FFA500",
    category: "productivite",
    description: "Se lever tôt chaque matin",
  },
];

// Habitude personnalisée créée pendant l'onboarding
let customOnboardingHabit = null;

let currentStep = 0;
let selectedTemplates = new Set();
let addedHabits = [];

/**
 * Vérifie si l'onboarding est nécessaire
 */
export function needsOnboarding() {
  if (localStorage.getItem("onboardingDone") === "true") return false;
  if (localStorage.getItem("warriorOnboardingDone") === "true") return false;
  // Check habits count
  const data = getData();
  const hasCustomHabits = data.customHabits && data.customHabits.length > 0;
  return habits.length === 0 && !hasCustomHabits;
}

/**
 * Lance l'onboarding
 */
export function startOnboarding() {
  currentStep = 0;
  selectedTemplates.clear();
  addedHabits = [];

  const overlay = document.getElementById("habitOnboardingOverlay");
  if (!overlay) return;

  renderStep();
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

/**
 * Ferme l'onboarding
 */
function closeOnboarding() {
  const overlay = document.getElementById("habitOnboardingOverlay");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
  localStorage.setItem("onboardingDone", "true");
  localStorage.setItem("warriorOnboardingDone", "true");
}

/**
 * Passe à l'étape suivante
 */
function nextStep() {
  if (currentStep === 1) {
    // Vérifier qu'au moins 1 habitude est sélectionnée
    const totalCount = selectedTemplates.size + (customOnboardingHabit ? 1 : 0);
    if (totalCount === 0) {
      // Petite animation shake sur le bouton
      const btn = document.querySelector(".onb-cta-btn");
      if (btn) {
        btn.classList.add("shake");
        setTimeout(() => btn.classList.remove("shake"), 500);
      }
      return;
    }
    // Créer les habitudes sélectionnées avant de passer à l'étape 3
    addedHabits = createSelectedHabits();
  }

  const container = document.querySelector(".onb-steps-container");
  if (container) {
    container.classList.add("slide-out-left");
    setTimeout(() => {
      currentStep++;
      renderStep();
      container.classList.remove("slide-out-left");
      container.classList.add("slide-in-right");
      setTimeout(() => container.classList.remove("slide-in-right"), 400);
    }, 300);
  } else {
    currentStep++;
    renderStep();
  }
}

/**
 * Revient à l'étape précédente
 */
function prevStep() {
  const container = document.querySelector(".onb-steps-container");
  if (container) {
    container.classList.add("slide-out-right");
    setTimeout(() => {
      currentStep--;
      renderStep();
      container.classList.remove("slide-out-right");
      container.classList.add("slide-in-left");
      setTimeout(() => container.classList.remove("slide-in-left"), 400);
    }, 300);
  } else {
    currentStep--;
    renderStep();
  }
}

/**
 * Toggle une template d'habitude
 */
function toggleTemplate(templateId) {
  if (selectedTemplates.has(templateId)) {
    selectedTemplates.delete(templateId);
  } else {
    selectedTemplates.add(templateId);
  }
  updateTemplateCards();
  updateCtaButton();
}

/**
 * Met à jour l'affichage des cards
 */
function updateTemplateCards() {
  document.querySelectorAll(".onb-template-card").forEach((card) => {
    const id = card.dataset.templateId;
    card.classList.toggle("selected", selectedTemplates.has(id));
  });
}

/**
 * Met à jour le bouton CTA
 */
function updateCtaButton() {
  const btn = document.querySelector(".onb-cta-btn");
  if (!btn) return;
  const count = selectedTemplates.size + (customOnboardingHabit ? 1 : 0);
  if (count === 0) {
    btn.textContent = "Sélectionne au moins 1 habitude";
    btn.classList.add("disabled");
  } else {
    btn.textContent = `Ajouter ${count} habitude${count > 1 ? "s" : ""} →`;
    btn.classList.remove("disabled");
  }
}

/**
 * Crée les habitudes sélectionnées dans le storage
 */
function createSelectedHabits() {
  const created = [];
  const data = getData();
  if (!data.customHabits) data.customHabits = [];

  // Ajouter les templates sélectionnés
  selectedTemplates.forEach((templateId) => {
    const template = HABIT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const habitId =
      "habit_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newHabit = {
      id: habitId,
      name: template.name,
      description: template.description || "",
      icon: template.icon,
      color: template.color,
      scheduleType: "daily",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      category: template.category || "autre",
    };

    habits.push(newHabit);
    data.customHabits.push(newHabit);
    created.push(newHabit);
  });

  // Ajouter l'habitude personnalisée si elle existe
  if (customOnboardingHabit) {
    const habitId =
      "habit_" +
      Date.now() +
      "_custom_" +
      Math.random().toString(36).substr(2, 5);
    const newHabit = {
      id: habitId,
      name: customOnboardingHabit.name,
      description: customOnboardingHabit.description || "",
      icon: customOnboardingHabit.icon,
      color: customOnboardingHabit.color,
      scheduleType: "daily",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      category: customOnboardingHabit.category || "autre",
    };

    habits.push(newHabit);
    data.customHabits.push(newHabit);
    created.push(newHabit);
  }

  if (created.length > 0) {
    saveData(data);
  }

  // Reset
  customOnboardingHabit = null;

  return created;
}

/**
 * Termine l'onboarding
 */
function finishOnboarding() {
  closeOnboarding();
  // Trigger UI update
  if (typeof window._onFilterChange === "function") window._onFilterChange();
}

/**
 * Render l'étape courante
 */
function renderStep() {
  const container = document.querySelector(".onb-steps-container");
  if (!container) return;

  // Update dots
  document.querySelectorAll(".onb-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === currentStep);
  });

  // Only welcome screen — habit selection is done via the "+" button after
  renderWelcome(container);
}

function renderWelcome(container) {
  container.innerHTML = `
        <div class="onb-step onb-step-welcome">
            <div class="onb-big-icon">🔥</div>
            <h1 class="onb-title">Prêt à transformer ta vie ?</h1>
            <p class="onb-text">
                Chaque jour est une opportunité de devenir meilleur.<br>
            </p>
            <button class="onb-cta-btn" id="onbNextBtn">Commencer 🚀</button>
        </div>
    `;
  container
    .querySelector("#onbNextBtn")
    .addEventListener("click", finishOnboarding);
}

function renderTemplates(container) {
  const cardsHtml = HABIT_TEMPLATES.map(
    (t) => `
        <div class="onb-template-card ${selectedTemplates.has(t.id) ? "selected" : ""}" 
             data-template-id="${t.id}">
            <div class="onb-template-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="onb-template-icon">${t.icon}</div>
            <div class="onb-template-name">${t.name}</div>
            <div class="onb-template-desc">${t.description}</div>
        </div>
    `,
  ).join("");

  const totalCount = selectedTemplates.size + (customOnboardingHabit ? 1 : 0);
  const ctaText =
    totalCount === 0
      ? "Sélectionne au moins 1 habitude"
      : `Ajouter ${totalCount} habitude${totalCount > 1 ? "s" : ""} →`;

  container.innerHTML = `
        <div class="onb-step onb-step-templates">
            <h2 class="onb-title">Crée tes habitudes</h2>
            <p class="onb-subtitle">Sélectionne celles qui te parlent ou crée la tienne !</p>
            <div class="onb-templates-grid">
                ${cardsHtml}
            </div>

            <div class="onb-custom-section">
                <div class="onb-custom-title">✨ Crée ta propre habitude</div>
                <div class="onb-custom-form ${customOnboardingHabit ? "has-custom" : ""}" id="onbCustomForm">
                    <div class="onb-custom-input-row">
                        <button class="onb-custom-emoji-btn" id="onbEmojiBtn">${customOnboardingHabit?.icon || "🎯"}</button>
                        <input type="text" class="onb-custom-input" id="onbCustomName" 
                               placeholder="Nom de ton habitude..."
                               maxlength="30"
                               value="${customOnboardingHabit?.name || ""}">
                        <button class="onb-custom-add-btn ${customOnboardingHabit ? "added" : ""}" id="onbCustomAddBtn">
                            ${customOnboardingHabit ? "✅" : "➕"}
                        </button>
                    </div>
                    <div class="onb-emoji-picker" id="onbEmojiPicker" style="display:none;">
                        ${[
                          "🎯",
                          "🏃",
                          "📖",
                          "🎵",
                          "💻",
                          "🍎",
                          "🚿",
                          "🧹",
                          "💤",
                          "🌅",
                          "✍️",
                          "🎨",
                          "🙏",
                          "💊",
                          "🚶",
                          "🧠",
                        ]
                          .map(
                            (e) =>
                              `<button class="onb-emoji-option" data-emoji="${e}">${e}</button>`,
                          )
                          .join("")}
                    </div>
                    ${
                      customOnboardingHabit
                        ? `
                        <div class="onb-custom-added">
                            <span>${customOnboardingHabit.icon} ${customOnboardingHabit.name}</span>
                            <button class="onb-custom-remove" id="onbCustomRemove">✕</button>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>

            <div class="onb-templates-actions">
                <button class="onb-back-btn" id="onbBackBtn">← Retour</button>
                <button class="onb-cta-btn ${totalCount === 0 ? "disabled" : ""}" id="onbAddBtn">${ctaText}</button>
            </div>
        </div>
    `;

  // Bind template cards
  container.querySelectorAll(".onb-template-card").forEach((card) => {
    card.addEventListener("click", () =>
      toggleTemplate(card.dataset.templateId),
    );
  });
  container.querySelector("#onbBackBtn").addEventListener("click", prevStep);
  container.querySelector("#onbAddBtn").addEventListener("click", nextStep);

  // Bind custom habit
  const emojiBtn = container.querySelector("#onbEmojiBtn");
  const emojiPicker = container.querySelector("#onbEmojiPicker");
  const customInput = container.querySelector("#onbCustomName");
  const customAddBtn = container.querySelector("#onbCustomAddBtn");
  const customRemove = container.querySelector("#onbCustomRemove");

  let selectedEmoji = customOnboardingHabit?.icon || "🎯";

  emojiBtn.addEventListener("click", () => {
    emojiPicker.style.display =
      emojiPicker.style.display === "none" ? "flex" : "none";
  });

  emojiPicker.querySelectorAll(".onb-emoji-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      selectedEmoji = opt.dataset.emoji;
      emojiBtn.textContent = selectedEmoji;
      emojiPicker.style.display = "none";
    });
  });

  customAddBtn.addEventListener("click", () => {
    const name = customInput.value.trim().toUpperCase();
    if (!name) return;
    customOnboardingHabit = {
      id: "tpl_custom_" + Date.now(),
      name: name,
      icon: selectedEmoji,
      color: "#19E639",
      category: "autre",
      description: "Habitude personnalisée",
    };
    renderTemplates(container); // Re-render to show added state
  });

  if (customRemove) {
    customRemove.addEventListener("click", () => {
      customOnboardingHabit = null;
      renderTemplates(container);
    });
  }

  // Enter key on input
  customInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") customAddBtn.click();
  });
}

function renderRecap(container) {
  const habitsListHtml = addedHabits
    .map(
      (h) => `
        <div class="onb-recap-habit">
            <span class="onb-recap-icon">${h.icon}</span>
            <span class="onb-recap-name">${h.name}</span>
        </div>
    `,
    )
    .join("");

  container.innerHTML = `
        <div class="onb-step onb-step-recap">
            <div class="onb-big-icon">🚀</div>
            <h1 class="onb-title">C'est parti !</h1>
            <p class="onb-subtitle">${addedHabits.length} habitude${addedHabits.length > 1 ? "s" : ""} ajoutée${addedHabits.length > 1 ? "s" : ""}</p>
            <div class="onb-recap-list">
                ${habitsListHtml}
            </div>
            <p class="onb-text">Ta transformation commence maintenant. Chaque jour compte. 💪</p>
            <button class="onb-cta-btn" id="onbFinishBtn">Commencer 🔥</button>
        </div>
    `;

  container
    .querySelector("#onbFinishBtn")
    .addEventListener("click", finishOnboarding);
}
