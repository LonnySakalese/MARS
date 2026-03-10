// ============================================================
// CHALLENGES.JS - Système de Challenges de groupe
// ============================================================

import { auth, db, isFirebaseConfigured } from "../config/firebase.js";
import { appState } from "../services/state.js";
import { showPopup } from "../ui/toast.js";
import { ConfirmModal } from "../ui/modals.js";
import { addXP } from "../core/xp.js";

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDaysRemaining(endDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatDate(dateVal) {
  const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// SEND AUTO MESSAGE IN GROUP CHAT
// ============================================================

async function sendAutoMessage(groupId, text) {
  try {
    await db.collection("groups").doc(groupId).collection("messages").add({
      type: "text",
      text,
      senderId: "system",
      senderPseudo: "🤖 Système",
      senderAvatar: "⚔️",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn("Erreur envoi message auto:", e);
  }
}

// ============================================================
// OPEN CREATE CHALLENGE MODAL
// ============================================================

export async function openCreateChallengeModal(groupId) {
  const modal = document.getElementById("createChallengeModal");
  if (!modal) return;

  // Reset fields
  const nameInput = document.getElementById("challengeName");
  const descInput = document.getElementById("challengeDesc");
  const startInput = document.getElementById("challengeStartDate");
  if (nameInput) nameInput.value = "";
  if (descInput) descInput.value = "";
  if (startInput) startInput.value = getTodayKey();

  // Set duration default
  document.querySelectorAll(".challenge-duration-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.duration === "7");
  });

  // Load group habits as checkboxes
  const habitsContainer = document.getElementById("challengeHabitsList");
  if (habitsContainer) {
    try {
      const gDoc = await db.collection("groups").doc(groupId).get();
      const g = gDoc.data() || {};
      const habitNames = g.habitNames || [];
      if (habitNames.length === 0) {
        habitsContainer.innerHTML =
          '<div style="color: var(--accent-dim); text-align: center; padding: 10px;">Aucune habitude dans ce groupe</div>';
      } else {
        habitsContainer.innerHTML = habitNames
          .map(
            (name) => `
                    <label class="group-habit-checkbox">
                        <input type="checkbox" value="${escapeHtml(name)}" checked>
                        <span class="group-habit-name">${escapeHtml(name)}</span>
                    </label>
                `,
          )
          .join("");
      }
    } catch (e) {
      habitsContainer.innerHTML =
        '<div style="color: var(--accent-dim);">Erreur chargement habitudes</div>';
    }
  }

  modal.dataset.groupId = groupId;
  modal.classList.add("active");
}

export function closeCreateChallengeModal() {
  const modal = document.getElementById("createChallengeModal");
  if (modal) modal.classList.remove("active");
}

export function setChallengeDuration(duration) {
  document.querySelectorAll(".challenge-duration-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.duration === String(duration));
  });
}

// ============================================================
// CREATE CHALLENGE
// ============================================================

export async function createChallenge() {
  if (!isFirebaseConfigured || !appState.currentUser) {
    showPopup("Tu dois être connecté", "error");
    return;
  }

  const modal = document.getElementById("createChallengeModal");
  const groupId = modal?.dataset.groupId;
  if (!groupId) return;

  const name = (document.getElementById("challengeName")?.value || "").trim();
  const description = (
    document.getElementById("challengeDesc")?.value || ""
  ).trim();
  const startDateStr = document.getElementById("challengeStartDate")?.value;

  if (!name) {
    showPopup("Le nom du challenge est requis", "warning");
    return;
  }
  if (name.length > 40) {
    showPopup("Le nom ne doit pas dépasser 40 caractères", "warning");
    return;
  }

  // Get duration
  const activeBtn = document.querySelector(".challenge-duration-btn.active");
  const duration = parseInt(activeBtn?.dataset.duration || "7");

  // Get selected habits
  const checkboxes = document.querySelectorAll(
    '#challengeHabitsList input[type="checkbox"]:checked',
  );
  if (checkboxes.length === 0) {
    showPopup("Sélectionne au moins 1 habitude", "warning");
    return;
  }
  const habitNames = Array.from(checkboxes).map((cb) => cb.value);

  // Calculate dates
  const startDate = new Date(startDateStr || getTodayKey());
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);

  const userId = appState.currentUser.uid;

  try {
    showPopup("Création du challenge...", "info");

    // Get user profile
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};

    // Create challenge
    const challengeRef = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .add({
        name,
        description,
        creatorId: userId,
        startDate: firebase.firestore.Timestamp.fromDate(startDate),
        endDate: firebase.firestore.Timestamp.fromDate(endDate),
        duration,
        habitNames,
        participantCount: 1,
        status: "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Add creator as participant
    await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeRef.id)
      .collection("participants")
      .doc(userId)
      .set({
        pseudo: userData.pseudo || "Anonyme",
        avatar: userData.avatar || "👤",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Auto message
    await sendAutoMessage(
      groupId,
      `⚔️ Nouveau challenge "${name}" lancé par ${userData.pseudo || "Anonyme"} ! Durée : ${duration} jours. Rejoignez le combat ! 💪`,
    );

    closeCreateChallengeModal();
    showPopup("Challenge créé ! 🔥", "success");

    // Refresh challenges tab
    renderChallenges(groupId);
  } catch (err) {
    console.error("Erreur createChallenge:", err);
    showPopup(`Erreur : ${err.message || "Inconnue"}`, "error");
  }
}

// ============================================================
// RENDER CHALLENGES LIST
// ============================================================

// ============================================================
// DELETE CHALLENGE (creator only)
// ============================================================

window.deleteChallengeConfirm = async function (groupId, challengeId, name) {
  const confirmed = await ConfirmModal.show({
    title: "SUPPRIMER LE CHALLENGE",
    message: `Supprimer "${name}" ? Cette action est irréversible.`,
    confirmText: "Supprimer",
    cancelText: "Annuler",
    danger: true,
  });

  if (!confirmed) return;

  try {
    const partsSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .collection("participants")
      .get();
    const batch = db.batch();
    partsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(
      db
        .collection("groups")
        .doc(groupId)
        .collection("challenges")
        .doc(challengeId),
    );
    await batch.commit();

    showPopup("Challenge supprimé", "success");
    renderChallenges(groupId);
  } catch (e) {
    console.error("Erreur suppression challenge:", e);
    showPopup("Erreur lors de la suppression", "error");
  }
};

export async function renderChallenges(groupId) {
  const container = document.getElementById("challengesTabContent");
  if (!container) return;

  container.innerHTML =
    '<div style="text-align:center; padding: 20px; color: var(--accent-dim);">⏳ Chargement...</div>';

  try {
    const snap = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      container.innerHTML = `
                <div class="challenge-empty">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">⚔️</div>
                    <div>Aucun challenge pour le moment</div>
                </div>`;
      return;
    }

    const userId = appState.currentUser?.uid;
    let activeHtml = "";
    let endedHtml = "";

    for (const doc of snap.docs) {
      const c = doc.data();
      const challengeId = doc.id;
      const isActive = c.status === "active";
      const daysLeft = isActive ? getDaysRemaining(c.endDate) : 0;

      // Check if ended but not marked
      if (isActive && daysLeft === 0) {
        await finishChallenge(groupId, challengeId, c);
        c.status = "ended";
      }

      // Check if user is participant
      let isParticipant = false;
      try {
        const pDoc = await db
          .collection("groups")
          .doc(groupId)
          .collection("challenges")
          .doc(challengeId)
          .collection("participants")
          .doc(userId)
          .get();
        isParticipant = pDoc.exists;
      } catch (e) {
        /* ignore */
      }

      const totalDays = c.duration || 7;
      const progressPct =
        c.status === "active"
          ? Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100))
          : 100;

      // Countdown color
      let countdownClass = "challenge-countdown-green";
      if (daysLeft <= 3) countdownClass = "challenge-countdown-red";
      else if (daysLeft <= 7) countdownClass = "challenge-countdown-orange";

      const card = `
                <div class="challenge-card ${c.status === "ended" ? "challenge-card-ended" : ""}" onclick="openChallengeDetail('${groupId}', '${challengeId}')">
                    <div class="challenge-card-header">
                        <div class="challenge-card-name">${escapeHtml(c.name)}</div>
                        <span class="challenge-status-badge ${c.status === "active" ? "challenge-badge-active" : "challenge-badge-ended"}">
                            ${c.status === "active" ? "🔥 EN COURS" : "✅ TERMINÉ"}
                        </span>
                    </div>
                    ${c.description ? `<div class="challenge-card-desc">${escapeHtml(c.description)}</div>` : ""}
                    <div class="challenge-card-meta">
                        <span>👥 ${c.participantCount || 0} participant${(c.participantCount || 0) > 1 ? "s" : ""}</span>
                        <span>📅 ${c.duration}j</span>
                        ${c.status === "active" ? `<span class="${countdownClass}">⏱️ ${daysLeft}j restant${daysLeft > 1 ? "s" : ""}</span>` : ""}
                    </div>
                    <div class="challenge-progress-bar">
                        <div class="challenge-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="challenge-card-actions">
                        ${
                          !isParticipant && c.status === "active"
                            ? `
                            <button class="challenge-join-btn" onclick="event.stopPropagation(); joinChallenge('${groupId}', '${challengeId}')">
                                Rejoindre
                            </button>`
                            : ""
                        }
                        ${
                          c.creatorId === userId
                            ? `
                            <button class="challenge-delete-btn" onclick="event.stopPropagation(); deleteChallengeConfirm('${groupId}', '${challengeId}', '${escapeHtml(c.name)}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>`
                            : ""
                        }
                    </div>
                </div>`;

      if (c.status === "active") activeHtml += card;
      else endedHtml += card;
    }

    let html = "";
    if (activeHtml) {
      html += `<div class="challenge-section-title">🔥 Challenges actifs</div>${activeHtml}`;
    }
    if (endedHtml) {
      html += `<div class="challenge-section-title" style="margin-top: 15px;">✅ Terminés</div>${endedHtml}`;
    }

    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur renderChallenges:", err);
    container.innerHTML =
      '<div style="text-align:center; padding: 20px; color: var(--accent-dim);">❌ Erreur de chargement</div>';
  }
}

// ============================================================
// JOIN CHALLENGE
// ============================================================

export async function joinChallenge(groupId, challengeId) {
  if (!appState.currentUser) return;
  const userId = appState.currentUser.uid;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};

    await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .collection("participants")
      .doc(userId)
      .set({
        pseudo: userData.pseudo || "Anonyme",
        avatar: userData.avatar || "👤",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .update({
        participantCount: firebase.firestore.FieldValue.increment(1),
      });

    showPopup("Tu as rejoint le challenge ! 💪", "success");
    renderChallenges(groupId);
  } catch (err) {
    console.error("Erreur joinChallenge:", err);
    showPopup("Erreur pour rejoindre le challenge", "error");
  }
}

// ============================================================
// LEAVE CHALLENGE
// ============================================================

export async function leaveChallenge(groupId, challengeId) {
  if (!appState.currentUser) return;
  const userId = appState.currentUser.uid;

  try {
    await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .collection("participants")
      .doc(userId)
      .delete();

    await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .update({
        participantCount: firebase.firestore.FieldValue.increment(-1),
      });

    showPopup("Tu as quitté le challenge", "info");
    renderChallenges(groupId);
  } catch (err) {
    console.error("Erreur leaveChallenge:", err);
    showPopup("Erreur pour quitter le challenge", "error");
  }
}

// ============================================================
// OPEN CHALLENGE DETAIL
// ============================================================

export async function openChallengeDetail(groupId, challengeId) {
  const container = document.getElementById("challengesTabContent");
  if (!container) return;

  container.innerHTML =
    '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">⏳ Chargement du classement...</div>';

  try {
    const cDoc = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .get();
    if (!cDoc.exists) {
      container.innerHTML =
        '<div style="text-align:center; padding: 20px;">Challenge introuvable</div>';
      return;
    }
    const c = cDoc.data();
    const userId = appState.currentUser?.uid;
    const isActive = c.status === "active";
    const daysLeft = isActive ? getDaysRemaining(c.endDate) : 0;
    const totalDays = c.duration || 7;
    const progressPct = isActive
      ? Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100))
      : 100;

    // Get participants
    const participantsSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .collection("participants")
      .get();

    const participants = [];
    let isParticipant = false;

    // Calculate scores for each participant
    const startDate = c.startDate.toDate
      ? c.startDate.toDate()
      : new Date(c.startDate);
    const endDate = c.endDate.toDate ? c.endDate.toDate() : new Date(c.endDate);
    const now = new Date();
    const effectiveEnd = now < endDate ? now : endDate;

    for (const pDoc of participantsSnap.docs) {
      const pData = pDoc.data();
      const memberId = pDoc.id;
      if (memberId === userId) isParticipant = true;

      // Calculate average score for challenge habits over the period
      let score = 0;
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

        const challengeHabitNamesLower = (c.habitNames || []).map((n) =>
          n.trim().toLowerCase(),
        );
        const relevantHabitIds = Object.entries(memberHabits)
          .filter(([, name]) =>
            challengeHabitNamesLower.includes(name.trim().toLowerCase()),
          )
          .map(([id]) => id);

        if (relevantHabitIds.length > 0) {
          // Count completions in the date range
          let totalDaysChecked = 0;
          let totalCompleted = 0;
          const curDate = new Date(startDate);
          curDate.setHours(0, 0, 0, 0);

          while (curDate <= effectiveEnd) {
            const dateKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;

            const completionsSnap = await db
              .collection("users")
              .doc(memberId)
              .collection("completions")
              .where("date", "==", dateKey)
              .where("completed", "==", true)
              .get();

            const completedIds = completionsSnap.docs.map(
              (d) => d.data().habitId,
            );
            const dayCompleted = relevantHabitIds.filter((id) =>
              completedIds.includes(id),
            ).length;

            totalCompleted += dayCompleted;
            totalDaysChecked += relevantHabitIds.length;

            curDate.setDate(curDate.getDate() + 1);
          }

          score =
            totalDaysChecked > 0
              ? Math.round((totalCompleted / totalDaysChecked) * 100)
              : 0;
        }
      } catch (e) {
        console.warn("Erreur calcul score participant", memberId, e);
      }

      participants.push({
        id: memberId,
        pseudo: pData.pseudo || "Anonyme",
        avatar: pData.avatar || "👤",
        score,
      });
    }

    // Sort by score descending
    participants.sort((a, b) => b.score - a.score);

    // Countdown color class
    let countdownClass = "challenge-countdown-green";
    if (daysLeft <= 3) countdownClass = "challenge-countdown-red";
    else if (daysLeft <= 7) countdownClass = "challenge-countdown-orange";

    const medals = ["🥇", "🥈", "🥉"];

    container.innerHTML = `
            <div class="challenge-detail">
                <button class="challenge-back-btn" onclick="renderChallenges('${groupId}')">← Retour</button>

                <div class="challenge-detail-header">
                    <h3 class="challenge-detail-name">${escapeHtml(c.name)}</h3>
                    <span class="challenge-status-badge ${isActive ? "challenge-badge-active" : "challenge-badge-ended"}">
                        ${isActive ? "🔥 EN COURS" : "✅ TERMINÉ"}
                    </span>
                </div>

                ${c.description ? `<p class="challenge-detail-desc">${escapeHtml(c.description)}</p>` : ""}

                <div class="challenge-detail-info">
                    <div class="challenge-info-item">
                        <span class="challenge-info-label">Début</span>
                        <span class="challenge-info-value">${formatDate(c.startDate)}</span>
                    </div>
                    <div class="challenge-info-item">
                        <span class="challenge-info-label">Fin</span>
                        <span class="challenge-info-value">${formatDate(c.endDate)}</span>
                    </div>
                    <div class="challenge-info-item">
                        <span class="challenge-info-label">Habitudes</span>
                        <span class="challenge-info-value">${(c.habitNames || []).map((n) => escapeHtml(n)).join(", ")}</span>
                    </div>
                </div>

                ${
                  isActive
                    ? `
                <div class="challenge-countdown-section">
                    <div class="challenge-countdown-label">Temps restant</div>
                    <div class="challenge-countdown-value ${countdownClass}">${daysLeft} jour${daysLeft > 1 ? "s" : ""}</div>
                    <div class="challenge-progress-bar challenge-progress-bar-large">
                        <div class="challenge-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                </div>`
                    : ""
                }

                <div class="challenge-leaderboard-title">🏆 Classement</div>
                <div class="challenge-leaderboard">
                    ${
                      participants.length === 0
                        ? '<div style="text-align:center; padding: 15px; color: var(--accent-dim);">Aucun participant</div>'
                        : participants
                            .map(
                              (p, i) => `
                        <div class="challenge-participant ${p.id === userId ? "challenge-participant-me" : ""}">
                            <div class="challenge-participant-rank">${i < 3 ? medals[i] : i + 1}</div>
                            <div class="challenge-participant-avatar">${p.avatar}</div>
                            <div class="challenge-participant-info">
                                <div class="challenge-participant-name">${escapeHtml(p.pseudo)}</div>
                                <div class="challenge-participant-bar-bg">
                                    <div class="challenge-participant-bar-fill" style="width: ${p.score}%"></div>
                                </div>
                            </div>
                            <div class="challenge-participant-score">${p.score}%</div>
                        </div>
                    `,
                            )
                            .join("")
                    }
                </div>

                <div class="challenge-detail-actions">
                    ${
                      isActive && isParticipant
                        ? `
                        <button class="challenge-leave-btn" onclick="leaveChallenge('${groupId}', '${challengeId}')">🚪 Quitter le challenge</button>
                    `
                        : ""
                    }
                    ${
                      isActive && !isParticipant
                        ? `
                        <button class="challenge-join-btn-large" onclick="joinChallenge('${groupId}', '${challengeId}')">🤝 Rejoindre le challenge</button>
                    `
                        : ""
                    }
                </div>
            </div>`;
  } catch (err) {
    console.error("Erreur openChallengeDetail:", err);
    container.innerHTML =
      '<div style="text-align:center; padding: 20px; color: var(--accent-dim);">❌ Erreur de chargement</div>';
  }
}

// ============================================================
// FINISH CHALLENGE (auto when daysLeft = 0)
// ============================================================

async function finishChallenge(groupId, challengeId, challengeData) {
  try {
    // Mark as ended
    await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .update({
        status: "ended",
      });

    // Calculate final rankings
    const participantsSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .collection("participants")
      .get();

    const c = challengeData;
    const startDate = c.startDate.toDate
      ? c.startDate.toDate()
      : new Date(c.startDate);
    const endDate = c.endDate.toDate ? c.endDate.toDate() : new Date(c.endDate);

    const rankings = [];

    for (const pDoc of participantsSnap.docs) {
      const memberId = pDoc.id;
      const pData = pDoc.data();
      let score = 0;

      try {
        const memberHabitsSnap = await db
          .collection("users")
          .doc(memberId)
          .collection("habits")
          .get();
        const memberHabits = {};
        memberHabitsSnap.docs.forEach((h) => {
          memberHabits[h.id] = h.data().name;
        });

        const challengeHabitNamesLower = (c.habitNames || []).map((n) =>
          n.trim().toLowerCase(),
        );
        const relevantHabitIds = Object.entries(memberHabits)
          .filter(([, name]) =>
            challengeHabitNamesLower.includes(name.trim().toLowerCase()),
          )
          .map(([id]) => id);

        if (relevantHabitIds.length > 0) {
          let totalDaysChecked = 0;
          let totalCompleted = 0;
          const curDate = new Date(startDate);
          curDate.setHours(0, 0, 0, 0);

          while (curDate <= endDate) {
            const dateKey = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;
            const completionsSnap = await db
              .collection("users")
              .doc(memberId)
              .collection("completions")
              .where("date", "==", dateKey)
              .where("completed", "==", true)
              .get();

            const completedIds = completionsSnap.docs.map(
              (d) => d.data().habitId,
            );
            const dayCompleted = relevantHabitIds.filter((id) =>
              completedIds.includes(id),
            ).length;
            totalCompleted += dayCompleted;
            totalDaysChecked += relevantHabitIds.length;
            curDate.setDate(curDate.getDate() + 1);
          }

          score =
            totalDaysChecked > 0
              ? Math.round((totalCompleted / totalDaysChecked) * 100)
              : 0;
        }
      } catch (e) {
        console.warn("Erreur calcul final", memberId, e);
      }

      rankings.push({ id: memberId, pseudo: pData.pseudo || "Anonyme", score });
    }

    rankings.sort((a, b) => b.score - a.score);

    // Award XP
    const xpRewards = [300, 200, 100];
    for (let i = 0; i < rankings.length; i++) {
      if (rankings[i].id === appState.currentUser?.uid) {
        if (i < 3) {
          addXP(xpRewards[i], `challenge_rank_${i + 1}`);
          showPopup(
            `🏆 Challenge terminé ! +${xpRewards[i]} XP (${i === 0 ? "1er" : i === 1 ? "2e" : "3e"})`,
            "success",
            5000,
          );
        }
        // Participation XP
        addXP(50, "challenge_participation");
      }
    }

    // Auto message
    const top3 = rankings.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    const podium = top3
      .map((r, i) => `${medals[i]} ${r.pseudo} (${r.score}%)`)
      .join("\n");
    await sendAutoMessage(
      groupId,
      `✅ Challenge "${c.name}" terminé !\n\n🏆 Classement final :\n${podium}\n\nBravo à tous les participants ! 🎉`,
    );
  } catch (err) {
    console.error("Erreur finishChallenge:", err);
  }
}
