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

  updateUI();
}

// Navigate to a specific date (called from week timeline)
export function goToDate(dateString) {
  // Parser la date ISO en heure locale (pas UTC)
  // new Date("2026-03-28") parse en UTC, ce qui décale d'un jour selon le fuseau
  const [year, month, day] = dateString.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(12, 0, 0, 0); // Midi pour éviter les problèmes de DST

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Don't allow navigating to future dates
  if (targetDate > today) return;

  setCurrentDate(targetDate);
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
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <style>
              @keyframes radar-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes pulse-ring {
                0% { transform: scale(0.8); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: scale(1.2); opacity: 0; }
              }
              .spin {
                transform-origin: 12px 12px;
                animation: radar-spin 4s linear infinite;
              }
              .pulse {
                transform-origin: 12px 12px;
                animation: pulse-ring 2s ease-out infinite;
              }
            </style>
            <circle cx="12" cy="12" r="10" stroke-width="1" opacity="0.5"/>
            <circle cx="12" cy="12" r="6" class="pulse"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <g class="spin">
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </g>
          </svg>
        </div>
        <div class="empty-state-title">HABITUDES EN ATTENTE</div>
        <div class="empty-state-text">
          Définis ta première habitude pour commencer ton ascension
        </div>
        <button class="empty-state-btn" onclick="openManageHabitsModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          CRÉER UNE HABITUDE
        </button>
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
      <div class="rest-state">
        <div class="rest-state-icon">🌙</div>
        <div class="rest-state-title">JOUR DE REPOS</div>
        <div class="rest-state-text">
          Aucune mission planifiée pour ${dayName}.<br>
          Récupère ton énergie, warrior.
        </div>
      </div>
    `;
    return;
  }

  if (filteredHabits.length === 0 && scheduledHabits.length > 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">AUCUNE MISSION</div>
        <div class="empty-state-text">Aucune habitude dans cette catégorie</div>
      </div>
    `;
    return;
  }

  const isPastDay = !isToday(currentDate);

  container.innerHTML = filteredHabits
    .map((habit, index) => {
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
          ? "Échoué"
          : "Accompli"
        : streak > 0
          ? `${streak}j`
          : "Nouveau";

      let cardClasses = ["mission-card"];
      if (locked) cardClasses.push("is-locked");
      if (checked) cardClasses.push("is-completed");
      else if (isFailed) cardClasses.push("is-failed");

      const descriptionHtml = description
        ? `<div class="mission-desc">${description}</div>`
        : "";

      // Calculate ring progress (circumference = 2 * PI * radius = 2 * 3.14159 * 15 ≈ 94.25)
      const circumference = 94.25;
      const offset = circumference - (monthData / 100) * circumference;

      // Staggered animation delay
      const animDelay = index * 0.05;

      return `
        <div class="${cardClasses.join(" ")}" ${onclickAttr} data-habit-id="${escapedId}" style="animation-delay: ${animDelay}s">
          <div class="mission-status-bar">
            <div class="mission-charge" style="height: ${checked ? 100 : 0}%"></div>
          </div>
          <div class="mission-content">
            <div class="mission-icon">${habit.icon}</div>
            <div class="mission-info">
              <div class="mission-name">${displayName}</div>
              ${descriptionHtml}
              <div class="mission-meta">
                <span class="mission-streak">
                  ${streak > 0 ? '<span class="mission-streak-fire">🔥</span>' : ""}
                  ${streakText}
                </span>
              </div>
            </div>
            <div class="mission-stats">
              <div class="mission-progress-ring">
                <svg width="38" height="38" viewBox="0 0 38 38">
                  <circle class="ring-bg" cx="19" cy="19" r="15"/>
                  <circle class="ring-fill" cx="19" cy="19" r="15"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"/>
                </svg>
              </div>
              <div class="mission-percent">${monthData}%</div>
            </div>
          </div>
          ${checked ? '<div class="mission-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>' : ""}
          ${isFailed ? '<div class="mission-fail-mark">✕</div>' : ""}
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

  // Animate the charge bar BEFORE updating data
  const escapedId = habitId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const cardEl = document.querySelector(
    `.mission-card[data-habit-id="${CSS.escape(habitId)}"]`,
  );

  if (cardEl) {
    const chargeBar = cardEl.querySelector(".mission-charge");
    if (chargeBar) {
      if (newStatus) {
        // Charge up animation
        chargeBar.style.transition = "none";
        chargeBar.style.height = "0%";
        void chargeBar.offsetWidth;
        chargeBar.style.transition =
          "height 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
        chargeBar.style.height = "100%";
        // Add completed class for visual feedback
        cardEl.classList.add("is-completed");
      } else {
        // Discharge animation
        chargeBar.style.transition = "height 0.4s ease-in";
        chargeBar.style.height = "0%";
        cardEl.classList.remove("is-completed");
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

// Renders the tactical week timeline (Mon-Sun) - clickable navigation with week arrows
function renderWeekDots() {
  const container = document.getElementById("weekTimeline");
  if (!container) return;

  const currentDate = getCurrentDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get Monday of current week (based on currentDate being viewed)
  const day = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  // Check if we're viewing the current week
  const todayMonday = new Date(today);
  const todayDay = today.getDay();
  todayMonday.setDate(todayMonday.getDate() - ((todayDay + 6) % 7));
  todayMonday.setHours(0, 0, 0, 0);
  const isCurrentWeek = monday.getTime() === todayMonday.getTime();

  // Get month/year label for the week
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const monthNames = [
    "JAN",
    "FÉV",
    "MAR",
    "AVR",
    "MAI",
    "JUN",
    "JUL",
    "AOÛ",
    "SEP",
    "OCT",
    "NOV",
    "DÉC",
  ];
  const weekLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${monday.getDate()}-${sunday.getDate()} ${monthNames[monday.getMonth()]}`
      : `${monday.getDate()} ${monthNames[monday.getMonth()]} - ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;

  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  let daysHtml = "";

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const dayNum = d.getDate();
    const isTodayDate = d.getTime() === today.getTime();
    const isCurrent = d.toDateString() === currentDate.toDateString();
    const isFuture = d > today;

    // ISO date string for navigation
    const dateISO = getDateKey(d);

    let nodeClasses = ["day-node"];
    if (isTodayDate) nodeClasses.push("is-today");
    if (isCurrent) nodeClasses.push("is-selected");

    if (!isFuture) {
      const score = getDayScore(d);
      const scheduled = habits.filter((h) => isHabitScheduledForDate(h, d));
      if (scheduled.length === 0) {
        nodeClasses.push("is-rest");
      } else if (score >= 80) {
        nodeClasses.push("is-good");
      } else if (score > 0) {
        nodeClasses.push("is-partial");
      } else if (!isTodayDate) {
        nodeClasses.push("is-missed");
      }
    } else {
      nodeClasses.push("is-future");
    }

    // Only clickable if not in the future
    const clickAttr = isFuture ? "" : `onclick="goToDate('${dateISO}')"`;

    daysHtml += `
      <div class="${nodeClasses.join(" ")}" ${clickAttr}>
        <div class="day-hex">
          <div class="day-hex-inner">
            <span class="day-num">${dayNum}</span>
          </div>
        </div>
        <span class="day-label">${labels[i]}</span>
      </div>
    `;
  }

  // Build full timeline with navigation
  container.innerHTML = `
    <button class="week-nav-btn week-nav-prev" onclick="changeWeek(-1)" aria-label="Semaine précédente">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <div class="week-days-container">
      <div class="week-label">${weekLabel}</div>
      <div class="week-days">
        ${daysHtml}
      </div>
    </div>
    <button class="week-nav-btn week-nav-next ${isCurrentWeek ? "disabled" : ""}" onclick="changeWeek(1)" aria-label="Semaine suivante" ${isCurrentWeek ? "disabled" : ""}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
    ${
      !isCurrentWeek
        ? `
      <button class="week-today-btn" onclick="goToDate('${today.toISOString().split("T")[0]}')" aria-label="Aujourd'hui">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>
    `
        : ""
    }
  `;
}

// Navigate to previous/next week
export function changeWeek(delta) {
  const currentDate = getCurrentDate();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + delta * 7);

  // Don't allow navigating to future weeks
  if (newDate > today) {
    // Go to today instead
    setCurrentDate(new Date());
  } else {
    setCurrentDate(newDate);
  }

  updateUI();
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

  if (score === 100) {
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
