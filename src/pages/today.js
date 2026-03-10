// ============================================================
// PAGE TODAY - HABITUDES DU JOUR
// ============================================================

import { habits, getCurrentDate, setCurrentDate } from "../services/state.js";
import {
  getData,
  saveData,
  getDayData,
  getDateKey,
} from "../services/storage.js";
import {
  getDayScore,
  getStreak,
  getPerfectDays,
  getHabitStreak,
  getHabitMonthProgress,
  formatDate,
  isToday,
  canEditDate,
  isDayValidated,
  getAvgScore,
} from "../core/scores.js";
import { getRank, rankSettings as _rankSettings } from "../core/ranks.js";
import {
  isHabitScheduledForDate,
  getHabitDisplayName,
  openManageHabitsModal,
  getActiveFilter,
  HABIT_CATEGORIES,
} from "../core/habits.js";
import { playSuccessSound, playUndoSound } from "../ui/sounds.js";
import { triggerConfetti } from "../ui/confetti.js";
import { showPopup } from "../ui/toast.js";
import { checkAndUnlockBadges } from "../core/badges.js";
import {
  awardHabitXP,
  awardDayValidatedXP,
  checkClearFatigue,
} from "../core/xp.js";
import { broadcastToUserGroups } from "../ui/auto-messages.js";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { appState } from "../services/state.js";

// Met à jour le statut (coché/décoché) d'une habitude pour aujourd'hui
function setHabitStatus(habitId, checked) {
  const currentDate = getCurrentDate();
  if (!canEditDate(currentDate)) {
    return;
  }
  const data = getData();
  const key = getDateKey(currentDate);
  if (!data.days[key]) data.days[key] = {};
  data.days[key][habitId] = checked;
  saveData(data);
  updateUI();
}

// Change la date affichée (jour précédent/suivant)
export function changeDate(delta) {
  const currentDate = getCurrentDate();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (delta === 0) {
    // Jump back to today
    setCurrentDate(new Date());
  } else {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    if (newDate > today) return;
    setCurrentDate(newDate);
  }

  // Show/hide "back to today" button
  const todayBtn = document.getElementById("dateNavToday");
  if (todayBtn) {
    const cur = getCurrentDate();
    const isToday = cur.toDateString() === new Date().toDateString();
    todayBtn.style.display = isToday ? "none" : "flex";
  }

  updateUI();
}

// Génère et affiche la liste des habitudes pour la date actuelle
export function renderHabits() {
  const container = document.getElementById("habitsList");
  const currentDate = getCurrentDate();
  const dayData = getDayData(currentDate);
  const locked = !canEditDate(currentDate);

  if (habits.length === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 50px 20px;">
                <div style="width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, rgba(46,204,113,0.15), rgba(46,204,113,0.05)); border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                <button class="action-btn action-btn-primary" onclick="openManageHabitsModal()" style="max-width: 260px; margin: 0 auto;">    
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                </div>
                <div style="font-size: 1rem; color: var(--accent); margin-bottom: 8px; font-weight: 800; letter-spacing: 1px;">
                    COMMENCE ICI
                </div>
                <div style="font-size: 0.82rem; color: var(--accent-dim); margin-bottom: 24px; line-height: 1.5;">
                    Crée ta première habitude pour démarrer ton parcours
                </div>
            </div>
        `;
    return;
  }

  const scheduledHabits = habits.filter((habit) =>
    isHabitScheduledForDate(habit, currentDate),
  );

  // No category filtering — show all scheduled habits
  const filteredHabits = scheduledHabits;

  // Hide category filters if present
  const filtersContainer = document.getElementById("categoryFilters");
  if (filtersContainer) filtersContainer.style.display = "none";

  if (scheduledHabits.length === 0) {
    const dayNames = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ];
    const dayName = dayNames[currentDate.getDay()];
    container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--accent-dim);">
                <div style="margin-bottom: 15px; opacity: 0.4;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/></svg></div>
                <div style="font-size: 1.1rem; color: var(--accent); margin-bottom: 10px; font-weight: bold;">
                    JOUR DE REPOS
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5;">
                    Aucune habitude planifiée pour ${dayName}.
                </div>
            </div>
        `;
    return;
  }

  if (filteredHabits.length === 0 && scheduledHabits.length > 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; color: var(--accent-dim);">
                <div style="margin-bottom: 10px; opacity: 0.4;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
                <div style="font-size: 0.9rem;">Aucune habitude dans cette catégorie</div>
            </div>
        `;
    return;
  }

  const isPastDay = !isToday(currentDate);

  container.innerHTML = filteredHabits
    .map((habit) => {
      const checked = dayData[habit.id] || false;
      const streak = getHabitStreak(habit.id);
      const monthData = getHabitMonthProgress(habit.id);
      const displayName = getHabitDisplayName(habit);
      const description = habit.description || "";
      const escapedId = habit.id.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const onclickAttr = locked ? "" : `onclick="toggleHabit('${escapedId}')"`;

      const isFailed = isPastDay && !checked;
      const streakText = locked
        ? isFailed
          ? "Non fait"
          : "Fait"
        : `Série: ${streak} jours`;

      let itemClasses = "habit-item";

      if (locked) {
        itemClasses += " locked";
      }
      if (checked) {
        itemClasses += " completed";
      } else if (isFailed) {
        itemClasses += " failed";
      }

      const descriptionHtml = description
        ? `<div class="habit-description">${description}</div>`
        : "";

      return `
            <div class="${itemClasses}" ${onclickAttr} data-habit-id="${escapedId}">
                <div class="habit-fill-bar"></div>
                <div class="habit-content">
                    <div class="habit-info">
                        <div class="habit-name">${habit.icon} ${displayName}</div>
                        ${descriptionHtml}
                        <div class="habit-streak">${streakText}</div>
                    </div>
                    <div class="habit-progress">
                        <div class="percent">${monthData}%</div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// Gère le clic sur une habitude pour la cocher/décocher
export function toggleHabit(habitId) {
  const currentDate = getCurrentDate();
  const dayData = getDayData(currentDate);
  const newStatus = !dayData[habitId];

  // Animate the fill bar BEFORE updating data
  const escapedId = habitId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const itemEl = document.querySelector(
    `.habit-item[data-habit-id="${CSS.escape(habitId)}"]`,
  );

  if (itemEl) {
    const bar = itemEl.querySelector(".habit-fill-bar");
    if (bar) {
      if (newStatus) {
        // Fill up like a glass of water (bottom → top)
        bar.style.transition = "none";
        bar.style.height = "0%";
        bar.style.opacity = "1";
        void bar.offsetWidth;
        bar.style.transition = "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
        bar.style.height = "100%";
      } else {
        // Drain down (top → bottom)
        bar.style.transition = "height 0.4s ease-in, opacity 0.4s ease-in";
        bar.style.height = "0%";
        bar.style.opacity = "0";
      }
    }
  }

  setHabitStatus(habitId, newStatus);

  if (newStatus) {
    playSuccessSound();
  } else {
    playUndoSound();
  }

  if (navigator.vibrate) {
    navigator.vibrate(newStatus ? [30, 30, 30] : 20);
  }

  if (newStatus) {
    const completed = habits.filter(
      (h) => getDayData(currentDate)[h.id],
    ).length;
    if (completed === habits.length) {
      triggerConfetti();
    }
    const currentScore = getDayScore(currentDate);
    if (checkClearFatigue(currentScore)) {
      if (window.updateXPDisplay) window.updateXPDisplay();
    }
  }
}

// ============================================================
// ANIMATION SCORE — Compteur animé + Pulse dopamine
// ============================================================

let _lastScore = null;
let _lastCompleted = null;

function animateCountUp(el, from, to, suffix = "", durationMs = 500) {
  if (from === to) {
    el.textContent = to + suffix;
    return;
  }
  const start = performance.now();
  const diff = to - from;
  function frame(now) {
    const t = Math.min((now - start) / durationMs, 1);
    // easeOutExpo for snappy feel
    const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const current = Math.round(from + diff * ease);
    el.textContent = current + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function pulseElement(el) {
  el.classList.remove("kpi-pulse");
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add("kpi-pulse");
}

function spawnScoreParticles(el) {
  const rect = el.getBoundingClientRect();
  const symbols = ["+", "×", "•", "★", "+"];
  for (let i = 0; i < 5; i++) {
    const p = document.createElement("span");
    p.className = "score-particle";
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left =
      rect.left + rect.width / 2 + (Math.random() - 0.5) * 60 + "px";
    p.style.top = rect.top + window.scrollY + "px";
    p.style.animationDelay = i * 60 + "ms";
    document.body.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

// Renders the week dots overview (Mon-Sun)
function renderWeekDots() {
  const container = document.getElementById("weekDots");
  if (!container) return;

  const currentDate = getCurrentDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get Monday of current week
  const day = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  let html = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const isToday = d.getTime() === today.getTime();
    const isCurrent = d.toDateString() === currentDate.toDateString();
    const isFuture = d > today;

    let dotClass = "week-dot";
    if (isCurrent) dotClass += " week-dot-current";

    if (!isFuture) {
      const score = getDayScore(d);
      const scheduled = habits.filter((h) => isHabitScheduledForDate(h, d));
      if (scheduled.length === 0) {
        dotClass += " week-dot-rest";
      } else if (score >= 80) {
        dotClass += " week-dot-good";
      } else if (score > 0) {
        dotClass += " week-dot-partial";
      } else if (!isToday) {
        dotClass += " week-dot-missed";
      }
    } else {
      dotClass += " week-dot-future";
    }

    html += `<div class="${dotClass}"><span class="week-dot-label">${labels[i]}</span><span class="week-dot-indicator"></span></div>`;
  }

  container.innerHTML = html;
}

// Met à jour les KPIs (score, streak, etc.) sur la page "Aujourd'hui"
export function updateKPIs() {
  try {
    const currentDate = getCurrentDate();
    const dayData = getDayData(currentDate);
    const scheduledToday = habits.filter((h) =>
      isHabitScheduledForDate(h, currentDate),
    );
    const completed = scheduledToday.filter((h) => dayData[h.id]).length;
    const score = getDayScore(currentDate);
    const locked = !canEditDate(currentDate);

    const dailyScoreEl = document.getElementById("dailyScore");
    const currentStreakEl = document.getElementById("currentStreak");
    const perfectDaysEl = document.getElementById("perfectDays");
    const completedCountEl = document.getElementById("completedCount");
    const currentDateEl = document.getElementById("currentDate");

    // Animate score count-up + dopamine effects
    if (dailyScoreEl) {
      const prevScore = _lastScore !== null ? _lastScore : score;
      if (score > prevScore) {
        animateCountUp(dailyScoreEl, prevScore, score, "%", 600);
        pulseElement(dailyScoreEl);
        spawnScoreParticles(dailyScoreEl);
      } else {
        animateCountUp(dailyScoreEl, prevScore, score, "%", 400);
        if (score < prevScore) pulseElement(dailyScoreEl);
      }
      _lastScore = score;

      // Update score banner bar + count
      const scoreFill = document.getElementById("scoreBannerFill");
      if (scoreFill) scoreFill.style.width = score + "%";
      const scoreCount = document.getElementById("scoreBannerCount");
      if (scoreCount)
        scoreCount.textContent = `${completed}/${scheduledToday.length}`;
    }

    // Week dots
    renderWeekDots();

    // Animate completed count
    if (completedCountEl) {
      if (locked) {
        completedCountEl.textContent = "VERROUILLÉ";
      } else {
        const prevCompleted =
          _lastCompleted !== null ? _lastCompleted : completed;
        if (completed !== prevCompleted) {
          pulseElement(completedCountEl);
        }
        completedCountEl.textContent = `${completed}/${scheduledToday.length}`;
        _lastCompleted = completed;
      }
    }

    if (currentStreakEl) currentStreakEl.textContent = getStreak();
    if (perfectDaysEl) perfectDaysEl.textContent = getPerfectDays();
    if (currentDateEl)
      currentDateEl.textContent =
        formatDate(currentDate) + (locked ? " (verrouillé)" : "");

    const data = getData();
    const currentStreak = getStreak();
    if (currentStreak > (data.stats?.bestStreak || 0)) {
      data.stats = data.stats || {};
      data.stats.bestStreak = currentStreak;
      saveData(data);
    }
  } catch (err) {
    console.error("Erreur updateKPIs:", err);
  }
}

// --- VALIDATION DE JOURNÉE ---

export function showValidateDayModal() {
  const modal = document.getElementById("validateDayModal");
  if (modal) {
    modal.classList.add("active");
  }
}

export function closeValidateDayModal() {
  const modal = document.getElementById("validateDayModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

export function confirmValidateDay() {
  if (!habits || habits.length === 0) {
    closeValidateDayModal();
    showPopup("Aucune habitude à valider", "warning");
    return;
  }

  // Jour de repos → aucune XP, pas de validation
  const scheduledForXP = habits.filter((h) =>
    isHabitScheduledForDate(h, new Date()),
  );
  if (scheduledForXP.length === 0) {
    closeValidateDayModal();
    showPopup("Jour de repos — rien à valider !", "info");
    return;
  }

  const data = getData();
  const today = getDateKey(new Date());

  if (!data.validatedDays) {
    data.validatedDays = [];
  }

  if (data.validatedDays.includes(today)) {
    closeValidateDayModal();
    showPopup("Journée déjà validée !", "info");
    return;
  }

  data.validatedDays.push(today);
  saveData(data);

  closeValidateDayModal();

  // Award XP — only at validation (within 24h rule)
  const dayDataToday2 = getDayData(new Date());
  const completedForXP = scheduledForXP.filter((h) => dayDataToday2[h.id]);
  const score = Math.round(
    (completedForXP.length / scheduledForXP.length) * 100,
  );

  // +10 XP per completed habit (only those actually done)
  completedForXP.forEach((h) => awardHabitXP(h.id));
  // +50 XP day validated + bonus 100 XP if perfect
  awardDayValidatedXP(score);

  // Track rank master days for "Légende Vivante" badge
  try {
    const avgScoreVal = getAvgScore();
    const currentRank = getRank(avgScoreVal);
    if (
      _rankSettings.length > 0 &&
      currentRank.name === _rankSettings[_rankSettings.length - 1].name
    ) {
      const data2 = getData();
      data2.rankMasterDays = (data2.rankMasterDays || 0) + 1;
      saveData(data2);
    }
  } catch (e) {
    /* ignore */
  }
  if (window.updateXPDisplay) window.updateXPDisplay();

  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
  showPopup("Journée validée !", "success");

  const dayDataToday = getDayData(new Date());
  const completedCount = habits.filter((h) => dayDataToday[h.id]).length;
  if (completedCount === habits.length && habits.length > 0) {
    triggerConfetti();
  }

  updateValidateButton();
  renderHabits();

  checkAndUnlockBadges();

  // Message auto dans les groupes
  if (isFirebaseConfigured && appState.currentUser) {
    const userId = appState.currentUser.uid;
    db.collection("users")
      .doc(userId)
      .get()
      .then((uDoc) => {
        const pseudo = uDoc.data()?.pseudo || "Anonyme";
        broadcastToUserGroups(
          userId,
          `${pseudo} a validé sa journée avec ${score}% `,
        );
      })
      .catch((err) => console.error("Erreur auto-message validation:", err));
  }
}

export function updateValidateButton() {
  const btn = document.getElementById("validateDayBtn");
  if (!btn) return;

  if (!habits || habits.length === 0) {
    btn.style.display = "none";
    return;
  }

  const today = getDateKey(new Date());
  const currentDate = getCurrentDate();
  const currentDateKey = getDateKey(currentDate);

  if (currentDateKey !== today) {
    btn.style.display = "none";
    return;
  }

  // Jour de repos = pas de bouton valider
  const scheduledToday = habits.filter((h) =>
    isHabitScheduledForDate(h, new Date()),
  );
  if (scheduledToday.length === 0) {
    btn.style.display = "none";
    return;
  }

  const data = getData();
  if (!data.validatedDays) data.validatedDays = [];

  if (data.validatedDays.includes(today)) {
    btn.style.display = "none";
  } else {
    btn.style.display = "block";
  }
}

// Render category filter buttons based on which categories the user's habits have
function renderCategoryFilters(scheduledHabits) {
  const filtersContainer = document.getElementById("categoryFilters");
  if (!filtersContainer) return;

  // Collect unique categories from scheduled habits
  const usedCategories = new Set();
  scheduledHabits.forEach((h) => usedCategories.add(h.category || "autre"));

  // Only show filters if there are 2+ categories
  if (usedCategories.size < 2) {
    filtersContainer.style.display = "none";
    return;
  }

  filtersContainer.style.display = "flex";
  const filter = getActiveFilter();

  let html = `<button class="category-filter ${filter === "all" ? "active" : ""}" data-category="all" onclick="filterByCategory('all')">Tout</button>`;

  HABIT_CATEGORIES.forEach((cat) => {
    if (usedCategories.has(cat.id)) {
      html += `<button class="category-filter ${filter === cat.id ? "active" : ""}" data-category="${cat.id}" onclick="filterByCategory('${cat.id}')">${cat.icon} ${cat.label}</button>`;
    }
  });

  filtersContainer.innerHTML = html;
}

// Fonction principale de mise à jour de l'UI
export function updateUI() {
  renderHabits();
  updateKPIs();
  updateValidateButton();
  if (window.updateXPDisplay) window.updateXPDisplay();
}
