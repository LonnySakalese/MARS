// ============================================================
// ANALYTICS AVANCÉS
// ============================================================

import { getData, getDateKey } from "../services/storage.js";
import { habits } from "../services/state.js";
import {
  isHabitScheduledForDate,
  getHabitDisplayName,
} from "../core/habits.js";

// Calcule le score d'un jour donné (reproduit la logique de scores.js pour éviter imports circulaires)
function calcDayScore(date, data) {
  if (habits.length === 0) return null;
  const scheduledHabits = habits.filter((h) =>
    isHabitScheduledForDate(h, date),
  );
  if (scheduledHabits.length === 0) return null;
  const key = getDateKey(date);
  const dayData = data.days[key] || {};
  const completed = scheduledHabits.filter((h) => dayData[h.id]).length;
  return Math.round((completed / scheduledHabits.length) * 100);
}

// Fonction principale de rendu
export function renderAnalytics(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = getData();
  if (
    !data.days ||
    Object.keys(data.days).length === 0 ||
    habits.length === 0
  ) {
    container.innerHTML = `
            <div class="analytics-card" style="text-align: center; padding: 40px 20px;">
                <div class="pulse-animation" style="margin-bottom: 15px; color: var(--accent-dim); opacity: 0.5;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                </div>
                <div style="color: var(--accent-dim); font-size: 0.85rem; line-height: 1.5;">
                    Pas assez de données.<br>Continue à tracker tes habitudes pour débloquer ces analyses !
                </div>
            </div>
        `;
    return;
  }

  let html = `
    <div class="analytics-unified-grid" style="
        display: grid; 
        grid-template-columns: 1fr; 
        gap: 16px;
    ">
        <div class="analytics-card" style="margin-bottom: 0;">
            ${renderBestDayOfWeek(data)}
        </div>
        
        <div class="analytics-card" style="margin-bottom: 0;">
            ${renderMonthComparison(data)}
        </div>
        
        <div class="analytics-card" style="margin-bottom: 0;">
            ${renderHabitRegularity(data)}
        </div>
    </div>
  `;

  container.innerHTML = html;

  // Dessiner les canvas après injection dans le DOM
  drawBestDayChart(data);
  drawMonthComparisonChart(data);
}

// ============================================================
// A. MEILLEUR JOUR DE LA SEMAINE
// ============================================================

function renderBestDayOfWeek(data) {
  return `
        <div class="analytics-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Meilleur jour de la semaine
        </div>
        <div style="position: relative; width: 100%;">
            <canvas id="bestDayCanvas" width="300" height="160" style="width:100%; height:auto;"></canvas>
            <div id="bestDayOverlay" class="chart-overlay-container">
                <div class="chart-overlay-content" style="padding: 15px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <p style="font-size: 0.8rem; margin-top: 8px;">Analyse disponible après 30 jours d'utilisation pour des stats cohérentes</p>
                </div>
            </div>
        </div>
    `;
}

function drawBestDayChart(data) {
  const canvas = document.getElementById("bestDayCanvas");
  const overlay = document.getElementById("bestDayOverlay");
  if (!canvas) return;

  const activeDays = Object.keys(data.days || {}).length;
  const isEligible = activeDays >= 30;

  if (!isEligible) {
    canvas.classList.add("blurred-canvas");
    if (overlay) overlay.classList.add("active");
  } else {
    canvas.classList.remove("blurred-canvas");
    if (overlay) overlay.classList.remove("active");
  }

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 160 * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.height = "160px";

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const dayScores = [0, 0, 0, 0, 0, 0, 0]; // index 0=Lun (JS day 1), ... 6=Dim (JS day 0)
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const score = calcDayScore(d, data);
    if (score !== null) {
      const jsDay = d.getDay(); // 0=dim, 1=lun, ...
      const idx = jsDay === 0 ? 6 : jsDay - 1; // 0=lun, 6=dim
      dayScores[idx] += score;
      dayCounts[idx]++;
    }
  }

  const avgScores = dayScores.map((s, i) =>
    dayCounts[i] > 0 ? Math.round(s / dayCounts[i]) : 0,
  );
  const maxScore = Math.max(...avgScores, 1);
  const bestIdx = avgScores.indexOf(Math.max(...avgScores));

  const w = rect.width;
  const h = 160;
  const barHeight = 12;
  const gap = (h - 10) / 7;
  const labelWidth = 35;
  const valueWidth = 40;
  const barAreaWidth = w - labelWidth - valueWidth - 10;

  // Get theme colors
  const isDark =
    !document.documentElement.getAttribute("data-theme") ||
    document.documentElement.getAttribute("data-theme") === "dark";
  const dimColor = isDark ? "#A3A39E" : "#6C757D";
  const accentColor = isDark ? "#F5F5F0" : "#212529";
  const greenColor = isDark ? "#19E639" : "#198754";
  const barBg = isDark ? "#1E1E1E" : "#E9ECEF";

  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < 7; i++) {
    const y = 5 + i * gap;
    const barW = maxScore > 0 ? (avgScores[i] / maxScore) * barAreaWidth : 0;
    const isBest = i === bestIdx && avgScores[i] > 0;

    // Label
    ctx.fillStyle = isBest ? greenColor : dimColor;
    ctx.font = `${isBest ? "bold " : ""}11px -apple-system, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(dayNames[i], labelWidth, y + barHeight / 2);

    // Bar background
    ctx.fillStyle = barBg;
    ctx.beginPath();
    roundRect(ctx, labelWidth + 8, y, barAreaWidth, barHeight, 4);
    ctx.fill();

    // Bar fill
    if (barW > 0) {
      ctx.fillStyle = isBest ? greenColor : isDark ? "#3A3A3A" : "#CED4DA";
      ctx.beginPath();
      roundRect(ctx, labelWidth + 8, y, barW, barHeight, 4);
      ctx.fill();
    }

    // Value
    ctx.fillStyle = isBest ? greenColor : accentColor;
    ctx.font = `${isBest ? "bold " : ""}11px -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(
      `${avgScores[i]}%`,
      labelWidth + barAreaWidth + 14,
      y + barHeight / 2,
    );
  }
}

// ============================================================
// B. COMPARAISON MENSUELLE
// ============================================================

function renderMonthComparison(data) {
  return `
        <div class="analytics-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            Comparaison Mensuelle
        </div>
        <div style="position: relative; height: 220px; width: 100%; margin-top: 10px;">
            <canvas id="monthComparisonCanvas"></canvas>
            <div id="monthComparisonCenter" style="
                position: absolute; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%); 
                text-align: center;
                pointer-events: none;
            ">
                <div id="monthComparisonValue" style="font-size: 1.8rem; font-weight: 800; color: var(--accent);">0%</div>
                <div style="font-size: 0.7rem; color: var(--accent-dim); text-transform: uppercase; letter-spacing: 1px;">Ce mois</div>
            </div>
        </div>
        <div id="monthComparisonLegend" style="margin-top: 10px;">
        </div>
    `;
}

// ... (skipping some lines) ...

function renderHabitRegularity(data) {
  if (habits.length === 0) return "";

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Only count days where the user actually tracked (has data)
  const trackedDays = Object.keys(data.days || {}).sort();
  if (trackedDays.length === 0) return "";

  const habitRates = [];

  for (const habit of habits) {
    let scheduled = 0;
    let completed = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);

      // Only count this day if user has tracked data for it
      if (!data.days[key]) continue;

      if (isHabitScheduledForDate(habit, d)) {
        scheduled++;
        const dayData = data.days[key] || {};
        if (dayData[habit.id]) {
          completed++;
        }
      }
    }

    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    habitRates.push({
      name: getHabitDisplayName(habit),
      icon: habit.icon || `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
      rate,
      scheduled,
    });
  }

  // Filter habits that were scheduled at least once
  const active = habitRates.filter((h) => h.scheduled > 0);
  if (active.length === 0) return "";

  active.sort((a, b) => b.rate - a.rate);
  const best = active[0];
  const worst = active[active.length - 1];

  const isDark = !document.documentElement.getAttribute("data-theme") || document.documentElement.getAttribute("data-theme") === "dark";
  const surfaceHover = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)";
  const greenBg = isDark ? "rgba(25, 230, 57, 0.15)" : "rgba(39, 174, 96, 0.15)";
  const redBg = isDark ? "rgba(255, 107, 107, 0.15)" : "rgba(231, 76, 60, 0.15)";
  const greenText = isDark ? "var(--accent-green)" : "#27ae60";
  const redText = isDark ? "#FF6B6B" : "#e74c3c";

  let html = `
        <div class="analytics-card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
            </svg>
            Régularité (30j)
        </div>
            
        <!-- Top Régularité -->
        <div style="margin-bottom: 12px;">
            <div style="font-size: 0.7rem; color: var(--accent-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
                    <path d="M4 22h16" />
                    <path d="M10 22V8h4v14" />
                    <path d="M6 14h12" />
                </svg>
                Top Régularité
            </div>
            <div style="background: ${surfaceHover}; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; height: 100%; width: ${best.rate}%; background: ${greenBg}; z-index: 0; border-radius: 12px 0 0 12px; transition: width 1s ease-out;"></div>
                <div style="position: relative; z-index: 1; font-size: 1.8rem; background: rgba(0,0,0,0.1); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">${best.icon}</div>
                <div style="position: relative; z-index: 1; flex: 1;">
                    <div style="font-weight: 600; color: var(--accent); font-size: 0.95rem;">${best.name}</div>
                    <div style="font-size: 0.8rem; color: ${greenText}; font-weight: 500;">En pleine forme</div>
                </div>
                <div style="position: relative; z-index: 1; font-weight: 800; font-size: 1.2rem; color: ${greenText};">${best.rate}%</div>
            </div>
        </div>`;

  if (active.length > 1 && worst.name !== best.name) {
    html += `
            <!-- À améliorer -->
            <div>
                <div style="font-size: 0.7rem; color: var(--accent-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    À surveiller
                </div>
                <div style="background: ${surfaceHover}; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; height: 100%; width: ${worst.rate}%; background: ${redBg}; z-index: 0; border-radius: 12px 0 0 12px; transition: width 1s ease-out;"></div>
                    <div style="position: relative; z-index: 1; font-size: 1.8rem; background: rgba(0,0,0,0.1); border-radius: 8px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">${worst.icon}</div>
                    <div style="position: relative; z-index: 1; flex: 1;">
                        <div style="font-weight: 600; color: var(--accent); font-size: 0.95rem;">${worst.name}</div>
                        <div style="font-size: 0.8rem; color: ${redText}; font-weight: 500;">Un peu d'effort</div>
                    </div>
                    <div style="position: relative; z-index: 1; font-weight: 800; font-size: 1.2rem; color: ${redText};">${worst.rate}%</div>
                </div>
            </div>`;
  }

  return html;
}

// ============================================================
// HELPER: Rounded rectangle
// ============================================================

function roundRect(ctx, x, y, width, height, radius) {
  if (width < 0) width = 0;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
