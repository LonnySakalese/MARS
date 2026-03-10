// ============================================================
// LEADERBOARD - Classement des membres du groupe (7 derniers jours)
// ============================================================

import { db, isFirebaseConfigured } from "../config/firebase.js";
import { appState } from "../services/state.js";
import { getRank } from "../core/ranks.js";

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getLast7DaysKeys() {
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${dd}`);
  }
  return keys;
}

// ============================================================
// RENDER LEADERBOARD
// ============================================================

export async function renderLeaderboard(groupId) {
  const container = document.getElementById("leaderboardContent");
  if (!container) return;

  container.innerHTML = `
        <div class="leaderboard-loading">
            <div class="leaderboard-loading-icon">⏳</div>
            <div>Calcul du classement...</div>
        </div>`;

  if (!isFirebaseConfigured || !appState.currentUser) {
    container.innerHTML = `
            <div class="leaderboard-empty">
                <div class="leaderboard-empty-icon">🔒</div>
                <div>Connecte-toi pour voir le classement</div>
            </div>`;
    return;
  }

  try {
    // 1. Get group data (habitNames)
    const gDoc = await db.collection("groups").doc(groupId).get();
    if (!gDoc.exists) {
      container.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">❌</div>
                    <div>Groupe introuvable</div>
                </div>`;
      return;
    }
    const groupData = gDoc.data();
    const groupHabitNamesLower = (groupData.habitNames || []).map((n) =>
      n.trim().toLowerCase(),
    );

    if (groupHabitNamesLower.length === 0) {
      container.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">📋</div>
                    <div>Aucune habitude dans ce groupe</div>
                </div>`;
      return;
    }

    // 2. Get all members
    const membersSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();
    const last7Days = getLast7DaysKeys();
    const userId = appState.currentUser?.uid;

    const memberScores = [];

    for (const mDoc of membersSnap.docs) {
      const mData = mDoc.data();
      const memberId = mDoc.id;

      try {
        // Get member's habits
        const memberHabitsSnap = await db
          .collection("users")
          .doc(memberId)
          .collection("habits")
          .get();
        const memberHabits = {};
        memberHabitsSnap.docs.forEach((h) => {
          memberHabits[h.id] = h.data().name;
        });

        // Find habit IDs that match group habit names
        const relevantHabitIds = Object.entries(memberHabits)
          .filter(([, name]) =>
            groupHabitNamesLower.includes(name.trim().toLowerCase()),
          )
          .map(([id]) => id);

        if (relevantHabitIds.length === 0) {
          memberScores.push({
            id: memberId,
            pseudo: mData.pseudo || "Anonyme",
            avatar: mData.avatar || "👤",
            avgScore: 0,
            streak: 0,
          });
          continue;
        }

        // Get completions for last 7 days
        const completionsSnap = await db
          .collection("users")
          .doc(memberId)
          .collection("completions")
          .where("date", "in", last7Days)
          .where("completed", "==", true)
          .get();

        const completionsByDate = {};
        completionsSnap.docs.forEach((d) => {
          const data = d.data();
          if (!completionsByDate[data.date]) completionsByDate[data.date] = [];
          completionsByDate[data.date].push(data.habitId);
        });

        // Calculate average score over the 7 days
        let totalScore = 0;
        let daysWithData = 0;
        let streak = 0;
        let streakBroken = false;

        for (const dayKey of last7Days) {
          const completedIds = completionsByDate[dayKey] || [];
          const completed = relevantHabitIds.filter((id) =>
            completedIds.includes(id),
          ).length;
          const dayScore = Math.round(
            (completed / relevantHabitIds.length) * 100,
          );

          totalScore += dayScore;
          daysWithData++;

          // Calculate streak (consecutive days >= 70% from most recent)
          if (!streakBroken) {
            if (dayScore >= 70) {
              streak++;
            } else {
              streakBroken = true;
            }
          }
        }

        const avgScore =
          daysWithData > 0 ? Math.round(totalScore / daysWithData) : 0;

        memberScores.push({
          id: memberId,
          pseudo: mData.pseudo || "Anonyme",
          avatar: mData.avatar || "👤",
          avgScore,
          streak,
        });
      } catch (e) {
        console.warn("Erreur calcul score membre", memberId, e);
        memberScores.push({
          id: memberId,
          pseudo: mData.pseudo || "Anonyme",
          avatar: mData.avatar || "👤",
          avgScore: 0,
          streak: 0,
        });
      }
    }

    // 3. Sort by average score descending
    memberScores.sort((a, b) => b.avgScore - a.avgScore);

    // 4. Render
    if (memberScores.length === 0) {
      container.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">👥</div>
                    <div>Aucun membre dans ce groupe</div>
                </div>`;
      return;
    }

    const positionEmojis = ["🥇", "🥈", "🥉"];

    let html = '<div class="leaderboard-list">';
    memberScores.forEach((m, i) => {
      const rank = getRank(m.avgScore);
      const isMe = m.id === userId;
      const position = i < 3 ? positionEmojis[i] : `${i + 1}`;
      const topClass = i < 3 ? `leaderboard-top-${i + 1}` : "";

      html += `
                <div class="leaderboard-card ${topClass} ${isMe ? "leaderboard-me" : ""}"
                     style="animation-delay: ${i * 0.08}s">
                    <div class="leaderboard-position">${position}</div>
                    <div class="leaderboard-avatar">${escapeHtml(m.avatar)}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-pseudo">${escapeHtml(m.pseudo)}${isMe ? ' <span class="leaderboard-you">(toi)</span>' : ""}</div>
                        <div class="leaderboard-meta">
                            <span class="leaderboard-rank" style="color: ${rank.color}">${rank.name}</span>
                            <span class="leaderboard-streak">🔥 ${m.streak}j</span>
                        </div>
                        <div class="leaderboard-bar">
                            <div class="leaderboard-bar-fill ${topClass}" style="width: ${m.avgScore}%"></div>
                        </div>
                    </div>
                    <div class="leaderboard-score">${m.avgScore}%</div>
                </div>`;
    });
    html += "</div>";

    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur renderLeaderboard:", err);
    container.innerHTML = `
            <div class="leaderboard-empty">
                <div class="leaderboard-empty-icon">❌</div>
                <div>Erreur de chargement du classement</div>
            </div>`;
  }
}
