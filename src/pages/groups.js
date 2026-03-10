// ============================================================
// GROUPS.JS - Système de Groupes
// ============================================================

import { auth, db, isFirebaseConfigured } from "../config/firebase.js";
import { appState, habits } from "../services/state.js";
import { showPopup } from "../ui/toast.js";
import { ConfirmModal } from "../ui/modals.js";
import { getRank } from "../core/ranks.js";
import {
  renderChatSection,
  startChatListener,
  stopChatListener,
  getUnreadCount,
} from "../ui/chat.js";
import { renderChallenges } from "../ui/challenges.js";
import { renderLeaderboard } from "../ui/leaderboard.js";

// ============================================================
// HELPERS
// ============================================================

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueCode() {
  let code,
    exists = true;
  while (exists) {
    code = generateCode();
    const snap = await db.collection("groups").where("code", "==", code).get();
    exists = !snap.empty;
  }
  return code;
}

// ============================================================
// RENDER GROUPS LIST (main page)
// ============================================================

export async function renderGroups() {
  const container = document.getElementById("groupsContainer");
  if (!container) return;

  if (!isFirebaseConfigured || !appState.currentUser) {
    container.innerHTML = `
            <div class="group-empty">
                <div class="group-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                <div>Connecte-toi pour accéder aux groupes</div>
            </div>`;
    return;
  }

  container.innerHTML = `
        <div class="groups-header">
            <button class="action-btn action-btn-primary" onclick="openCreateGroupModal()" style="flex:1;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Créer</span>
            </button>
            <button class="action-btn action-btn-secondary" onclick="openJoinGroupModal()" style="flex:1;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span>Rejoindre</span>
            </button>
        </div>
        <div class="groups-list" id="groupsList">
            <div class="group-empty"><div class="group-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div>Chargement...</div></div>
        </div>`;

  try {
    const userDoc = await db
      .collection("users")
      .doc(appState.currentUser.uid)
      .get();
    const userData = userDoc.data() || {};
    const groupIds = userData.groups || [];

    const listEl = document.getElementById("groupsList");

    if (groupIds.length === 0) {
      listEl.innerHTML = `
                <div class="group-empty">
                    <div class="group-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                    <div>Aucun groupe pour le moment</div>
                    <div style="font-size: 0.8rem; margin-top: 8px; color: var(--accent-dim);">
                        Crée un groupe ou rejoins-en un avec un code d'invitation !
                    </div>
                </div>`;
      return;
    }

    let cardsHtml = "";
    for (const gId of groupIds) {
      try {
        const gDoc = await db.collection("groups").doc(gId).get();
        if (!gDoc.exists) continue;
        const g = gDoc.data();

        // Get member avatars (up to 5)
        const membersSnap = await db
          .collection("groups")
          .doc(gId)
          .collection("members")
          .limit(5)
          .get();
        const avatars = membersSnap.docs.map((d) => d.data().avatar || "👤");

        // Get unread count
        let unreadCount = 0;
        try {
          unreadCount = await getUnreadCount(gId);
        } catch (e) {
          /* ignore */
        }

        // Get last message preview
        let lastMsgPreview = "";
        let lastMsgTime = "";
        try {
          const lastMsgSnap = await db
            .collection("groups")
            .doc(gId)
            .collection("messages")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
          if (!lastMsgSnap.empty) {
            const lastMsg = lastMsgSnap.docs[0].data();
            const sender = lastMsg.senderPseudo || "Anonyme";
            const text =
              lastMsg.type === "audio" ? "Audio" : lastMsg.text || "";
            lastMsgPreview = `${sender}: ${text.length > 40 ? text.substring(0, 40) + "…" : text}`;
            if (lastMsg.createdAt) {
              const d = lastMsg.createdAt.toDate();
              lastMsgTime =
                d.getHours().toString().padStart(2, "0") +
                ":" +
                d.getMinutes().toString().padStart(2, "0");
            }
          }
        } catch (e) {
          /* ignore */
        }

        // Get online members count (active in last 5 min)
        let onlineCount = 0;
        try {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
          const onlineSnap = await db
            .collection("groups")
            .doc(gId)
            .collection("members")
            .where("lastSeen", ">", fiveMinAgo)
            .get();
          onlineCount = onlineSnap.size;
        } catch (e) {
          /* ignore */
        }

        cardsHtml += `
                    <div class="group-card" onclick="openGroupDetail('${gId}')">
                        <div class="group-card-header">
                            <div class="group-card-name">
                                ${escapeHtml(g.name)}
                                ${unreadCount > 0 ? `<span class="group-unread-badge">${unreadCount}</span>` : ""}
                            </div>
                            <div class="group-card-meta">
                                ${onlineCount > 0 ? `<span class="group-online-dot"></span><span class="group-online-count">${onlineCount}</span>` : ""}
                                <span class="group-card-count">${g.memberCount || 0} </span>
                                ${lastMsgTime ? `<span class="group-card-time">${lastMsgTime}</span>` : ""}
                            </div>
                        </div>
                        ${lastMsgPreview ? `<div class="group-card-preview">${escapeHtml(lastMsgPreview)}</div>` : ""}
                        <div class="group-card-avatars">
                            ${avatars.map((a) => `<span class="group-card-avatar">${a}</span>`).join("")}
                            ${(g.memberCount || 0) > 5 ? `<span class="group-card-avatar-more">+${g.memberCount - 5}</span>` : ""}
                        </div>
                    </div>`;
      } catch (e) {
        console.warn("Erreur chargement groupe", gId, e);
      }
    }

    listEl.innerHTML =
      cardsHtml ||
      `
            <div class="group-empty">
                <div class="group-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <div>Aucun groupe trouvé</div>
            </div>`;
  } catch (err) {
    console.error("Erreur renderGroups:", err);
    document.getElementById("groupsList").innerHTML = `
            <div class="group-empty">
                <div class="group-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                <div>Erreur de chargement</div>
            </div>`;
  }
}

// ============================================================
// CREATE GROUP
// ============================================================

export function openCreateGroupModal() {
  const modal = document.getElementById("createGroupModal");
  if (!modal) return;

  // Populate habits checkboxes
  const habitsListEl = document.getElementById("createGroupHabits");
  if (habitsListEl) {
    if (habits.length === 0) {
      habitsListEl.innerHTML =
        '<div style="color: var(--accent-dim); text-align: center; padding: 10px;">Aucune habitude créée</div>';
    } else {
      habitsListEl.innerHTML = habits
        .map(
          (h) => `
                <label class="group-habit-checkbox">
                    <input type="checkbox" value="${h.id}" data-name="${escapeHtml(h.name)}">
                    <span class="group-habit-icon">${h.icon || "•"}</span>
                    <span class="group-habit-name">${escapeHtml(h.name)}</span>
                </label>
            `,
        )
        .join("");
    }
  }

  // Reset fields
  const nameInput = document.getElementById("createGroupName");
  const descInput = document.getElementById("createGroupDesc");
  if (nameInput) nameInput.value = "";
  if (descInput) descInput.value = "";

  modal.classList.add("active");
}

export function closeCreateGroupModal() {
  const modal = document.getElementById("createGroupModal");
  if (modal) modal.classList.remove("active");
}

export async function createGroup() {
  if (!isFirebaseConfigured || !appState.currentUser) {
    showPopup("Tu dois être connecté", "error");
    return;
  }

  const name = (document.getElementById("createGroupName")?.value || "").trim();
  const description = (
    document.getElementById("createGroupDesc")?.value || ""
  ).trim();

  if (!name) {
    showPopup("Le nom du groupe est requis", "warning");
    return;
  }
  if (name.length > 30) {
    showPopup("Le nom ne doit pas dépasser 30 caractères", "warning");
    return;
  }
  if (description.length > 100) {
    showPopup("La description ne doit pas dépasser 100 caractères", "warning");
    return;
  }

  // Get selected habits
  const checkboxes = document.querySelectorAll(
    '#createGroupHabits input[type="checkbox"]:checked',
  );
  if (checkboxes.length === 0) {
    showPopup("Sélectionne au moins 1 habitude", "warning");
    return;
  }

  const habitNames = Array.from(checkboxes).map((cb) => cb.dataset.name);

  try {
    showPopup("Création en cours...", "info");
    const code = await generateUniqueCode();
    const userId = appState.currentUser.uid;
    console.log("📝 Création groupe:", { name, habitNames, userId });

    // Get user profile
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};

    const goal = (
      document.getElementById("createGroupGoal")?.value || ""
    ).trim();

    // Create group document
    const groupData = {
      name,
      description,
      code,
      creatorId: userId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      habitNames,
      memberCount: 1,
    };
    if (goal) groupData.goal = { text: goal, progress: 0 };

    const groupRef = await db.collection("groups").add(groupData);
    console.log("✅ Groupe créé:", groupRef.id);

    // Add creator as member
    await db
      .collection("groups")
      .doc(groupRef.id)
      .collection("members")
      .doc(userId)
      .set({
        pseudo: userData.pseudo || userData.profile?.pseudo || "Anonyme",
        avatar: userData.avatar || userData.profile?.avatar || "👤",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Add group to user's groups array
    await db
      .collection("users")
      .doc(userId)
      .update({
        groups: firebase.firestore.FieldValue.arrayUnion(groupRef.id),
      });

    closeCreateGroupModal();
    showPopup(`Groupe créé ! Code : ${code}`, "success", 5000);
    renderGroups();
  } catch (err) {
    console.error("❌ Erreur createGroup:", err);
    showPopup(
      `Erreur : ${err.message || err.code || "Inconnue"}`,
      "error",
      6000,
    );
  }
}

// ============================================================
// JOIN GROUP
// ============================================================

export function openJoinGroupModal() {
  const modal = document.getElementById("joinGroupModal");
  if (!modal) return;

  const input = document.getElementById("joinGroupCode");
  if (input) input.value = "";

  modal.classList.add("active");
}

export function closeJoinGroupModal() {
  const modal = document.getElementById("joinGroupModal");
  if (modal) modal.classList.remove("active");
  stopQRScanner();
}

// ============================================================
// QR CODE SCANNER
// ============================================================

let qrScannerStream = null;
let qrScannerInterval = null;

export function toggleQRScanner() {
  const container = document.getElementById("qrScannerContainer");
  if (!container) return;

  if (container.style.display === "none") {
    startQRScanner();
  } else {
    stopQRScanner();
  }
}

async function startQRScanner() {
  const container = document.getElementById("qrScannerContainer");
  const video = document.getElementById("qrScannerVideo");
  if (!container || !video) return;

  // Check BarcodeDetector support
  if (!("BarcodeDetector" in window)) {
    showPopup("Scanner non supporté sur ce navigateur", "warning");
    return;
  }

  try {
    qrScannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = qrScannerStream;
    container.style.display = "block";

    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    qrScannerInterval = setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          // Extract group code — could be a URL or raw code
          let code = value;
          if (value.includes("join=")) {
            code = value.split("join=")[1].substring(0, 6);
          } else if (value.length === 6) {
            code = value;
          }

          const input = document.getElementById("joinGroupCode");
          if (input) input.value = code.toUpperCase();

          stopQRScanner();
          showPopup("QR code scanné !", "success");
          if (navigator.vibrate) navigator.vibrate(100);
        }
      } catch (e) {
        /* scan error, continue */
      }
    }, 300);
  } catch (err) {
    console.error("QR Scanner error:", err);
    showPopup("Accès caméra refusé", "error");
  }
}

function stopQRScanner() {
  const container = document.getElementById("qrScannerContainer");
  if (container) container.style.display = "none";

  if (qrScannerStream) {
    qrScannerStream.getTracks().forEach((t) => t.stop());
    qrScannerStream = null;
  }
  if (qrScannerInterval) {
    clearInterval(qrScannerInterval);
    qrScannerInterval = null;
  }
}

// Join by code directly (used by QR deep link)
export async function joinGroupByCode(code) {
  if (!code) return;
  // Set input value and call joinGroup
  const input = document.getElementById("joinGroupCode");
  if (input) input.value = code;
  await joinGroup(code);
}

export async function joinGroup(directCode) {
  if (!isFirebaseConfigured || !appState.currentUser) {
    showPopup("Tu dois être connecté", "error");
    return;
  }

  const code = (
    directCode ||
    document.getElementById("joinGroupCode")?.value ||
    ""
  )
    .trim()
    .toUpperCase();

  if (!code || code.length !== 6) {
    showPopup("Entre un code de 6 caractères", "warning");
    return;
  }

  try {
    const snap = await db.collection("groups").where("code", "==", code).get();

    if (snap.empty) {
      showPopup("Code invalide. Aucun groupe trouvé.", "error");
      return;
    }

    const groupDoc = snap.docs[0];
    const groupData = groupDoc.data();
    const groupId = groupDoc.id;
    const userId = appState.currentUser.uid;

    // Check if already a member
    const memberDoc = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .doc(userId)
      .get();
    if (memberDoc.exists) {
      showPopup("Tu es déjà membre de ce groupe !", "warning");
      return;
    }

    // Check required habits
    const userHabitNames = habits.map((h) => h.name.trim().toLowerCase());
    const requiredNames = groupData.habitNames || [];
    const missing = requiredNames.filter(
      (rn) => !userHabitNames.includes(rn.trim().toLowerCase()),
    );

    if (missing.length > 0) {
      showPopup(`Habitudes manquantes : ${missing.join(", ")}`, "error", 6000);
      return;
    }

    // Get user profile
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data() || {};

    // Add as member
    await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .doc(userId)
      .set({
        pseudo: userData.pseudo || userData.profile?.pseudo || "Anonyme",
        avatar: userData.avatar || userData.profile?.avatar || "👤",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Increment member count
    await db
      .collection("groups")
      .doc(groupId)
      .update({
        memberCount: firebase.firestore.FieldValue.increment(1),
      });

    // Add to user's groups
    await db
      .collection("users")
      .doc(userId)
      .update({
        groups: firebase.firestore.FieldValue.arrayUnion(groupId),
      });

    closeJoinGroupModal();
    showPopup(`Tu as rejoint "${groupData.name}" !`, "success");
    renderGroups();
  } catch (err) {
    console.error("Erreur joinGroup:", err);
    showPopup("Erreur lors de la tentative de rejoindre", "error");
  }
}

// ============================================================
// GROUP DETAIL
// ============================================================

export async function openGroupDetail(groupId) {
  const modal = document.getElementById("groupDetailModal");
  if (!modal) return;

  const content = document.getElementById("groupDetailContent");
  if (content)
    content.innerHTML =
      '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">⏳ Chargement...</div>';

  modal.classList.add("active");
  modal.dataset.groupId = groupId;

  try {
    const gDoc = await db.collection("groups").doc(groupId).get();
    if (!gDoc.exists) {
      content.innerHTML =
        '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">Groupe introuvable</div>';
      return;
    }

    const g = gDoc.data();
    const userId = appState.currentUser?.uid;
    const isCreator = g.creatorId === userId;

    // Get all members
    const membersSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();
    const members = [];

    for (const mDoc of membersSnap.docs) {
      const mData = mDoc.data();
      const memberId = mDoc.id;

      // Calculate today's score for this member
      let todayScore = 0;
      try {
        const todayKey = getTodayKey();
        const completionsSnap = await db
          .collection("users")
          .doc(memberId)
          .collection("completions")
          .where("date", "==", todayKey)
          .where("completed", "==", true)
          .get();

        // Match completions to group habits
        const memberHabitsSnap = await db
          .collection("users")
          .doc(memberId)
          .collection("habits")
          .get();
        const memberHabits = {};
        memberHabitsSnap.docs.forEach((h) => {
          memberHabits[h.id] = h.data().name;
        });

        const groupHabitNamesLower = (g.habitNames || []).map((n) =>
          n.trim().toLowerCase(),
        );
        const relevantHabitIds = Object.entries(memberHabits)
          .filter(([, name]) =>
            groupHabitNamesLower.includes(name.trim().toLowerCase()),
          )
          .map(([id]) => id);

        const completedIds = completionsSnap.docs.map((d) => d.data().habitId);
        const completed = relevantHabitIds.filter((id) =>
          completedIds.includes(id),
        ).length;
        todayScore =
          relevantHabitIds.length > 0
            ? Math.round((completed / relevantHabitIds.length) * 100)
            : 0;
      } catch (e) {
        console.warn("Erreur calcul score membre", memberId, e);
      }

      // Get member profile for rank calculation
      let avgScore = 0;
      try {
        const statsDoc = await db
          .collection("users")
          .doc(memberId)
          .collection("stats")
          .doc("global")
          .get();
        if (statsDoc.exists) {
          avgScore = statsDoc.data().avgScore || 0;
        }
      } catch (e) {
        /* ignore */
      }

      // Fetch real pseudo from /users/{uid} if member doc has no pseudo
      let pseudo = mData.pseudo;
      let avatar = mData.avatar;
      if (!pseudo || pseudo === "Anonyme") {
        try {
          const userDoc = await db.collection("users").doc(memberId).get();
          if (userDoc.exists) {
            const ud = userDoc.data();
            pseudo =
              ud.pseudo ||
              ud.profile?.pseudo ||
              ud.displayName ||
              pseudo ||
              "Anonyme";
            avatar = ud.avatar || ud.profile?.avatar || avatar || "👤";
          }
        } catch (e) {
          /* ignore */
        }
      }

      members.push({
        id: memberId,
        pseudo: pseudo || "Anonyme",
        avatar: avatar || "👤",
        todayScore,
        rank: getRank(avgScore),
        isCreator: memberId === g.creatorId,
      });
    }

    // Sort by today's score descending
    members.sort((a, b) => b.todayScore - a.todayScore);

    content.innerHTML = `
            <div class="group-detail">
                <div class="group-detail-header">
                    <h3 class="group-detail-name">${escapeHtml(g.name)}</h3>
                    ${g.description ? `<p class="group-detail-desc">${escapeHtml(g.description)}</p>` : ""}
                    <div class="group-code-section">
                        <span class="group-code-label">Code d'invitation</span>
                        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                            <div class="group-code" onclick="copyGroupCode('${g.code}')">
                                <span class="group-code-value">${g.code}</span>
                                <span class="group-code-copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>
                            </div>
                            <button class="group-qr-btn" onclick="showQRModal('${g.code}')" style="background: var(--charcoal); border: 1px solid var(--steel); border-radius: 8px; padding: 8px 12px; color: var(--accent); font-size: 1.1rem; cursor: pointer;">QR</button>
                        </div>
                    </div>
                    <div class="group-detail-count">${g.memberCount || members.length} membre${(g.memberCount || members.length) > 1 ? "s" : ""}</div>
                </div>

                <div class="group-goal">
                    <div class="group-goal-header">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB84D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                        <span class="group-goal-title">Objectif</span>
                        ${g.creatorId === userId ? `<button class="group-goal-edit-btn" onclick="editGroupGoal('${groupId}', '${escapeAttr(g.goal?.text || "")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>` : ""}
                    </div>
                    ${g.goal?.text ? `<div class="group-goal-text">${escapeHtml(g.goal.text)}</div>` : `<div class="group-goal-text" style="opacity:0.4; font-style:italic;">${g.creatorId === userId ? "Aucun objectif défini — appuie sur le stylo" : "Aucun objectif défini"}</div>`}
                    ${g.goal?.text ? `<div class="group-goal-bar"><div class="group-goal-bar-fill" style="width: ${g.goal.progress || 0}%"></div></div>` : ""}
                </div>

                <div class="group-detail-habits">
                    <div class="group-detail-habits-title">Habitudes du groupe</div>
                    <div class="group-detail-habits-list">
                        ${(g.habitNames || []).map((n) => `<span class="group-habit-tag">${escapeHtml(n)}</span>`).join("")}
                    </div>
                </div>

                <div class="group-tabs">
                    <button class="group-tab active" data-tab="chat" onclick="switchGroupTab('chat', '${groupId}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Chat</button>
                    <button class="group-tab" data-tab="leaderboard" onclick="switchGroupTab('leaderboard', '${groupId}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> Classement</button>
                    <button class="group-tab" data-tab="challenges" onclick="switchGroupTab('challenges', '${groupId}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg> Challenges</button>
                </div>

                <div class="group-tab-content" id="groupTabChat">
                    <div class="group-members-title">MEMBRES</div>
                    <div class="group-members-list">
                        ${members
                          .map(
                            (m, i) => `
                            <div class="group-member ${m.id === userId ? "group-member-me" : ""}">
                                <div class="group-member-position">${i + 1}</div>
                                <div class="group-member-avatar">${m.avatar}</div>
                                <div class="group-member-info">
                                    <div class="group-member-pseudo">${escapeHtml(m.pseudo)}${m.isCreator ? ' <span class="group-creator-badge">Chef</span>' : ""}</div>
                                    <div class="group-member-rank" style="color: ${m.rank.color}">${m.rank.name}</div>
                                </div>
                                <div class="group-member-score">${m.todayScore}%</div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>

                    ${renderChatSection(groupId)}
                </div>

                <div class="group-tab-content" id="groupTabLeaderboard" style="display: none;">
                    <div id="leaderboardContent">
                        <div class="leaderboard-loading">
                            <div class="leaderboard-loading-icon" style="color:var(--accent-dim)">...</div>
                            <div>Chargement...</div>
                        </div>
                    </div>
                </div>

                <div class="group-tab-content" id="groupTabChallenges" style="display: none;">
                    ${
                      isCreator
                        ? `<button class="action-btn action-btn-secondary" onclick="openCreateChallengeModal('${groupId}')" style="width:100%;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>Nouveau challenge</span>
                    </button>`
                        : ""
                    }
                    <div id="challengesTabContent">
                        <div style="text-align:center; padding: 20px; color: var(--accent-dim);">⏳ Chargement...</div>
                    </div>
                </div>

                <div class="group-detail-actions">
                    ${
                      isCreator
                        ? `
                        <button class="group-danger-btn" onclick="deleteGroup('${groupId}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Supprimer le groupe</button>
                    `
                        : `
                        <button class="group-danger-btn" onclick="leaveGroup('${groupId}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Quitter le groupe</button>
                    `
                    }
                </div>
            </div>`;

    // Start real-time chat listener
    startChatListener(groupId);
  } catch (err) {
    console.error("Erreur openGroupDetail:", err);
    content.innerHTML =
      '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">Erreur de chargement</div>';
  }
}

// ============================================================
// TAB SWITCHING (Chat / Leaderboard)
// ============================================================

let leaderboardLoaded = false;
let challengesLoaded = false;

export function switchGroupTab(tab, groupId) {
  const chatPanel = document.getElementById("groupTabChat");
  const leaderboardPanel = document.getElementById("groupTabLeaderboard");
  const challengesPanel = document.getElementById("groupTabChallenges");

  // Update tab buttons
  document.querySelectorAll(".group-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  // Hide all
  if (chatPanel) chatPanel.style.display = "none";
  if (leaderboardPanel) leaderboardPanel.style.display = "none";
  if (challengesPanel) challengesPanel.style.display = "none";

  if (tab === "chat") {
    if (chatPanel) chatPanel.style.display = "block";
  } else if (tab === "leaderboard") {
    if (leaderboardPanel) leaderboardPanel.style.display = "block";
    if (!leaderboardLoaded) {
      leaderboardLoaded = true;
      renderLeaderboard(groupId);
    }
  } else if (tab === "challenges") {
    if (challengesPanel) challengesPanel.style.display = "block";
    if (!challengesLoaded) {
      challengesLoaded = true;
      renderChallenges(groupId);
    }
  }
}

export function closeGroupDetail() {
  leaderboardLoaded = false;
  challengesLoaded = false;
  stopChatListener();
  const modal = document.getElementById("groupDetailModal");
  if (modal) modal.classList.remove("active");
}

// ============================================================
// LEAVE / DELETE GROUP
// ============================================================

export async function leaveGroup(groupId) {
  const confirmed = await ConfirmModal.show({
    title: "QUITTER LE GROUPE",
    message: "Es-tu sûr de vouloir quitter ce groupe ?",
    confirmText: "Quitter",
    cancelText: "Annuler",
    danger: true,
  });

  if (!confirmed) return;

  try {
    const userId = appState.currentUser.uid;

    await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .doc(userId)
      .delete();
    await db
      .collection("groups")
      .doc(groupId)
      .update({
        memberCount: firebase.firestore.FieldValue.increment(-1),
      });
    await db
      .collection("users")
      .doc(userId)
      .update({
        groups: firebase.firestore.FieldValue.arrayRemove(groupId),
      });

    closeGroupDetail();
    showPopup("Tu as quitté le groupe", "success");
    renderGroups();
  } catch (err) {
    console.error("Erreur leaveGroup:", err);
    showPopup("Erreur lors de la sortie du groupe", "error");
  }
}

export async function deleteGroup(groupId) {
  const confirmed = await ConfirmModal.show({
    title: "SUPPRIMER LE GROUPE",
    message: "Supprimer ce groupe définitivement ?",
    subtext: "Tous les membres seront retirés.",
    confirmText: "Supprimer",
    cancelText: "Annuler",
    danger: true,
  });

  if (!confirmed) return;

  try {
    // Get all members to remove from their groups arrays
    const membersSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();

    const batch = db.batch();

    for (const mDoc of membersSnap.docs) {
      // Remove group from each member's groups array
      batch.update(db.collection("users").doc(mDoc.id), {
        groups: firebase.firestore.FieldValue.arrayRemove(groupId),
      });
      // Delete member sub-doc
      batch.delete(mDoc.ref);
    }

    // Delete the group document
    batch.delete(db.collection("groups").doc(groupId));

    await batch.commit();

    closeGroupDetail();
    showPopup("Groupe supprimé", "success");
    renderGroups();
  } catch (err) {
    console.error("Erreur deleteGroup:", err);
    showPopup("Erreur lors de la suppression", "error");
  }
}

// ============================================================
// COPY CODE
// ============================================================

export function copyGroupCode(code) {
  navigator.clipboard
    .writeText(code)
    .then(() => {
      showPopup("Code copié !", "success");
    })
    .catch(() => {
      showPopup(`Code : ${code}`, "info");
    });
}

// ============================================================
// PROFILE GROUPS SECTION
// ============================================================

export async function renderProfileGroups() {
  const container = document.getElementById("profileGroups");
  if (!container) return;

  if (!isFirebaseConfigured || !appState.currentUser) {
    container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--accent-dim);">
                <div style="margin-bottom: 10px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                <div>Connecte-toi pour voir tes groupes</div>
            </div>`;
    return;
  }

  try {
    const userDoc = await db
      .collection("users")
      .doc(appState.currentUser.uid)
      .get();
    const userData = userDoc.data() || {};
    const groupIds = userData.groups || [];

    if (groupIds.length === 0) {
      container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--accent-dim);">
                    <div style="margin-bottom: 10px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                    <div>Aucun groupe pour le moment</div>
                    <div style="font-size: 0.8rem; margin-top: 5px; cursor: pointer; color: var(--accent);"
                         onclick="showPage('groups', event)">Rejoindre ou créer un groupe →</div>
                </div>`;
      return;
    }

    let html = "";
    for (const gId of groupIds) {
      try {
        const gDoc = await db.collection("groups").doc(gId).get();
        if (!gDoc.exists) continue;
        const g = gDoc.data();
        html += `
                    <div class="profile-group-card" onclick="openGroupDetail('${gId}')">
                        <div class="profile-group-card-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div class="profile-group-card-info">
                            <div class="profile-group-card-name">${escapeHtml(g.name)}</div>
                            <div class="profile-group-card-members">${g.memberCount || 0} membres</div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(255,255,255,0.3);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>`;
      } catch (e) {
        /* skip */
      }
    }
    container.innerHTML = html;
  } catch (err) {
    console.error("Erreur renderProfileGroups:", err);
  }
}

// ============================================================
// UTILS
// ============================================================

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// Edit group goal — modal for creator
window.editGroupGoal = function (groupId, currentText) {
  const old = document.getElementById("editGoalModal");
  if (old) old.remove();

  // Fermer le modal groupe
  const groupModal = document.getElementById("groupDetailModal");
  if (groupModal) groupModal.classList.remove("active");

  const modal = document.createElement("div");
  modal.id = "editGoalModal";
  modal.className = "bdm-overlay";
  modal.innerHTML = `
        <div class="bdm-modal" style="padding: 24px;">
            <div style="font-size: 1rem; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; text-align: center;">Modifier l'objectif</div>
            <textarea id="editGoalInput" style="width: 100%; min-height: 80px; background: var(--charcoal); border: 1px solid var(--steel); border-radius: 10px; color: var(--accent); padding: 12px; font-size: 0.9rem; resize: vertical; font-family: inherit;" maxlength="200" placeholder="Ex: Tenir 30 jours sans craquer">${currentText.replace(/\\'/g, "'")}</textarea>
            <div style="font-size: 0.65rem; color: var(--accent-dark); text-align: right; margin-top: 4px;"><span id="editGoalCount">${currentText.length}</span>/200</div>
            <div style="display: flex; gap: 10px; margin-top: 16px;">
                <button onclick="document.getElementById('editGoalModal').remove(); openGroupDetail('${groupId}');" style="flex:1; padding: 12px; border-radius: 10px; border: 1px solid var(--steel); background: var(--charcoal); color: var(--accent-dim); font-weight: 700; cursor: pointer;">Annuler</button>
                <button onclick="saveGroupGoal('${groupId}')" style="flex:1; padding: 12px; border-radius: 10px; border: none; background: var(--accent-green); color: #000; font-weight: 700; cursor: pointer;">Enregistrer</button>
            </div>
        </div>
    `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
      openGroupDetail(groupId);
    }
  });

  document.body.appendChild(modal);

  const input = document.getElementById("editGoalInput");
  const counter = document.getElementById("editGoalCount");
  input.addEventListener("input", () => {
    counter.textContent = input.value.length;
  });
  input.focus();
};

window.saveGroupGoal = async function (groupId) {
  const input = document.getElementById("editGoalInput");
  if (!input) return;
  const text = input.value.trim();

  try {
    const updateData = text
      ? { goal: { text, progress: 0 } }
      : { goal: firebase.firestore.FieldValue.delete() };
    await db.collection("groups").doc(groupId).update(updateData);
    document.getElementById("editGoalModal")?.remove();
    showPopup("Objectif mis à jour", "success");
    openGroupDetail(groupId);
  } catch (e) {
    console.error("Erreur update goal:", e);
    showPopup("Erreur lors de la mise à jour", "error");
  }
};
