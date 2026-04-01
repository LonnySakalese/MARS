// ============================================================
// CHARTS - GRAPHIQUES DE PROGRESSION
// ============================================================

import { habits, getWeeklyChart, setWeeklyChart, getHabitsChart, setHabitsChart } from '../services/state.js';
import { getDayScore, getHabitMonthProgress } from '../core/scores.js';
import { getData } from '../services/storage.js';

// Génère et affiche la grille des scores de la semaine
export function renderWeeklyGrid() {
    const container = document.getElementById('weeklyGrid');
    if (!container) return;
    const today = new Date();
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    let html = '';
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const score = getDayScore(date);
        
        let customStyle = '';
        if (score === 100) {
            // .perfect class will handle the styling
        } else if (score === 0) {
            customStyle = 'background: rgba(231, 76, 60, 0.4);'; // Red for 0%
        } else {
            const opacity = Math.max(0.1, (score / 100) * 0.8);
            customStyle = `background: rgba(46, 204, 113, ${opacity});`; // Green with opacity
        }

        html += `
            <div class="weekly-day ${i === 0 ? 'today' : ''} ${score === 100 ? 'perfect' : ''}" style="${customStyle}">
                <div class="day-name">${dayNames[date.getDay()]}</div>
                <div class="day-score">${score}%</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Génère et met à jour les graphiques
export function renderCharts() {
    const weeklyCanvas = document.getElementById('weeklyChart');
    const habitsCanvas = document.getElementById('habitsChart');
    if (!weeklyCanvas || !habitsCanvas) return;

    // Graphique de score hebdomadaire
    const weeklyCtx = weeklyCanvas.getContext('2d');
    const weeklyData = [];
    const weeklyLabels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        weeklyLabels.push(date.getDate() + '/' + (date.getMonth() + 1));
        weeklyData.push(getDayScore(date));
    }

    // Gradient fill for weekly chart
    const gradient = weeklyCtx.createLinearGradient(0, 0, 0, weeklyCanvas.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    let wChart = getWeeklyChart();
    if (wChart) wChart.destroy();
    wChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: weeklyLabels,
            datasets: [{
                data: weeklyData,
                borderColor: '#FFFFFF',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: weeklyData.map(v => v === 100 ? '#FFB84D' : '#FFFFFF'),
                pointBorderColor: weeklyData.map(v => v === 100 ? '#FFB84D' : '#FFFFFF'),
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, ticks: { color: '#888', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#AAA', font: { size: 11, weight: '600' } }, grid: { display: false } }
            }
        }
    });
    setWeeklyChart(wChart);

    // Graphique de performance par habitude
    const habitsCtx = habitsCanvas.getContext('2d');
    const overlay = document.getElementById('habitsChartOverlay');
    
    // Déterminer si l'utilisateur est éligible (4 jours d'activité + 2 habitudes min)
    const appData = getData();
    const activeDays = Object.keys(appData.days || {}).length;
    const isEligible = activeDays >= 4 && habits.length >= 2;

    if (!isEligible) {
        habitsCanvas.classList.add('blurred-canvas');
        if (overlay) overlay.classList.add('active');
    } else {
        habitsCanvas.classList.remove('blurred-canvas');
        if (overlay) overlay.classList.remove('active');
    }

    if (habits.length === 0) {
        let hChart = getHabitsChart();
        if (hChart) hChart.destroy();
        return;
    }

    // Préparation des données triées par performance
    const habitsWithProgress = habits.map(h => ({
        label: `${h.icon} ${h.name}`,
        progress: getHabitMonthProgress(h.id)
    })).sort((a, b) => b.progress - a.progress);

    const habitsLabels = habitsWithProgress.map(h => h.label);
    const habitsData = habitsWithProgress.map(h => h.progress);

    let hChart = getHabitsChart();
    if (hChart) hChart.destroy();
    hChart = new Chart(habitsCtx, {
        type: 'bar',
        data: {
            labels: habitsLabels,
            datasets: [{
                data: habitsData,
                backgroundColor: habitsData.map(v => v >= 80 ? 'rgba(46,204,113,0.7)' : v >= 50 ? 'rgba(243,156,18,0.6)' : 'rgba(231,76,60,0.5)'),
                borderColor: habitsData.map(v => v >= 80 ? '#2ECC71' : v >= 50 ? '#F39C12' : '#E74C3C'),
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.parsed.x}% de réussite`
                    }
                }
            },
            scales: {
                x: { 
                    min: 0, 
                    max: 100, 
                    ticks: { 
                        color: '#888', 
                        font: { size: 10 },
                        callback: (value) => value + '%'
                    }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                y: { 
                    ticks: { 
                        color: '#F5F5F0', 
                        font: { size: 11, weight: '500' },
                        align: 'start',
                        crossAlign: 'center'
                    }, 
                    grid: { display: false } 
                }
            },
            layout: {
                padding: {
                    left: 0,
                    right: 10,
                    top: 0,
                    bottom: 0
                }
            }
        }
    });
    setHabitsChart(hChart);
}
