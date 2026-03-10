/**
 * notifications.js — Push notifications (FCM) + local reminders
 */
import { appState } from "./state.js";

// VAPID key — needs to be generated in Firebase Console > Cloud Messaging > Web Push certificates
let vapidKey = null;
let messagingInstance = null;

// Default notification preferences
const DEFAULT_PREFS = {
  dailyReminder: true,
  reminderHour: 20, // 20h par défaut
  newMessage: true,
  memberJoined: true,
  // Ces deux-là sont toujours ON (pas désactivables)
  // newChallenge: true (always),
  // challengeResult: true (always)
};

/**
 * Get notification preferences from Firestore
 */
export async function getNotifPrefs() {
  const uid = appState.currentUser?.uid;
  if (!uid) return { ...DEFAULT_PREFS };

  try {
    const doc = await firebase.firestore().collection("users").doc(uid).get();
    const data = doc.data();
    return {
      ...DEFAULT_PREFS,
      ...(data?.notifPrefs || {}),
    };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Save notification preferences to Firestore
 */
export async function saveNotifPrefs(prefs) {
  const uid = appState.currentUser?.uid;
  if (!uid) return;

  try {
    await firebase.firestore().collection("users").doc(uid).update({
      notifPrefs: prefs,
    });
  } catch (e) {
    console.warn("Save notif prefs error:", e);
  }
}

/**
 * Initialize FCM and request permission
 */
export async function initNotifications() {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported");
    return false;
  }

  if (Notification.permission === "denied") {
    console.warn("Notifications denied by user");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    // Try FCM
    if (firebase.messaging) {
      messagingInstance = firebase.messaging();

      // Get VAPID key from Firestore config
      try {
        const configDoc = await firebase
          .firestore()
          .collection("config")
          .doc("fcm")
          .get();
        if (configDoc.exists) {
          vapidKey = configDoc.data().vapidKey;
        }
      } catch (e) {
        /* no config yet */
      }

      if (vapidKey) {
        const token = await messagingInstance.getToken({ vapidKey });
        if (token) {
          await saveFcmToken(token);
          setupForegroundHandler();
          console.log("✅ FCM token saved");
          return true;
        }
      } else {
        console.warn(
          "No VAPID key configured — FCM disabled, local notifications only",
        );
      }
    }

    // Even without FCM, local notifications work
    return true;
  } catch (e) {
    console.warn("Notification init error:", e);
    return false;
  }
}

/**
 * Save FCM token to Firestore
 */
async function saveFcmToken(token) {
  const uid = appState.currentUser?.uid;
  if (!uid) return;

  try {
    await firebase
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
        lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (e) {
    console.warn("Save FCM token error:", e);
  }
}

/**
 * Handle foreground messages
 */
function setupForegroundHandler() {
  if (!messagingInstance) return;

  messagingInstance.onMessage((payload) => {
    console.log("📩 Foreground message:", payload);
    const { title, body, icon } = payload.notification || {};
    if (title) {
      showLocalNotification(title, body, icon);
    }
  });
}

/**
 * Show a local notification
 */
export function showLocalNotification(title, body, icon) {
  if (Notification.permission !== "granted") return;

  const notif = new Notification(title, {
    body,
    icon: icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    tag: "fevrier-" + Date.now(),
  });

  notif.onclick = () => {
    window.focus();
    notif.close();
  };
}

/**
 * Schedule daily reminder (uses localStorage timer check)
 */
export async function checkDailyReminder() {
  const prefs = await getNotifPrefs();
  if (!prefs.dailyReminder) return;

  const now = new Date();
  const hour = now.getHours();
  const today = now.toDateString();
  const lastReminder = localStorage.getItem("lastDailyReminder");

  if (lastReminder === today) return; // Already reminded today

  if (hour >= prefs.reminderHour) {
    // Check if user already validated today
    const { getData } = await import("../services/data.js");
    const data = getData();
    const dateKey = now.toISOString().split("T")[0];
    const dayData = data.history?.[dateKey];

    if (!dayData?.validated) {
      showLocalNotification(
        "PROJET MARS",
        "N'oublie pas de valider ta journée ! 💪",
      );
      localStorage.setItem("lastDailyReminder", today);
    }
  }
}

/**
 * Send notification to a user (stores in Firestore for Cloud Function to pick up)
 * This is a "notification queue" — needs Cloud Functions to actually send FCM pushes
 */
export async function queueNotification(targetUid, type, data) {
  try {
    await firebase.firestore().collection("notifications").add({
      targetUid,
      type, // 'newMessage', 'memberJoined', 'newChallenge', 'challengeResult'
      data,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.warn("Queue notification error:", e);
  }
}

/**
 * Get notification permission status
 */
export function getNotifStatus() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // 'granted', 'denied', 'default'
}

/**
 * Render notification settings UI
 */
export async function renderNotifSettings(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const prefs = await getNotifPrefs();
  const status = getNotifStatus();
  const isGranted = status === "granted";

  container.innerHTML = `
        <div class="notif-settings">
            ${
              status === "denied"
                ? `
                <div class="notif-blocked-banner">
                    Notifications bloquées. Active-les dans les réglages de ton navigateur.
                </div>
            `
                : ""
            }
            ${
              status === "default"
                ? `
                <button class="notif-enable-btn" id="enableNotifBtn">
                    Activer les notifications
                </button>
            `
                : ""
            }
            ${isGranted ? '<div class="notif-status-ok">Notifications activées</div>' : ""}
            
            <div class="notif-toggle-list" style="${isGranted ? "" : "opacity:0.5; pointer-events:none;"}">
                <div class="notif-toggle-item">
                    <div class="notif-toggle-info">
                        <div class="notif-toggle-label">⏰ Rappel quotidien</div>
                        <div class="notif-toggle-desc">Rappel si tu n'as pas validé ta journée</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="notifDailyReminder" ${prefs.dailyReminder ? "checked" : ""}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="notif-toggle-item notif-sub" id="reminderHourRow" style="${prefs.dailyReminder ? "" : "display:none;"}">
                    <div class="notif-toggle-info">
                        <div class="notif-toggle-desc">Heure du rappel</div>
                    </div>
                    <select id="notifReminderHour" class="notif-hour-select">
                        ${[18, 19, 20, 21, 22].map((h) => `<option value="${h}" ${prefs.reminderHour === h ? "selected" : ""}>${h}h00</option>`).join("")}
                    </select>
                </div>
                <div class="notif-toggle-item">
                    <div class="notif-toggle-info">
                        <div class="notif-toggle-label">Nouveaux messages</div>
                        <div class="notif-toggle-desc">Messages dans tes groupes</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="notifNewMessage" ${prefs.newMessage ? "checked" : ""}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="notif-toggle-item">
                    <div class="notif-toggle-info">
                        <div class="notif-toggle-label">Nouveau membre</div>
                        <div class="notif-toggle-desc">Quand quelqu'un rejoint ton groupe</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="notifMemberJoined" ${prefs.memberJoined ? "checked" : ""}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="notif-toggle-item notif-locked">
                    <div class="notif-toggle-info">
                        <div class="notif-toggle-label">Nouveau challenge</div>
                        <div class="notif-toggle-desc">Toujours activé</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked disabled>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="notif-toggle-item notif-locked">
                    <div class="notif-toggle-info">
                        <div class="notif-toggle-label">Résultat challenge</div>
                        <div class="notif-toggle-desc">Toujours activé</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" checked disabled>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;

  // Bind events
  const enableBtn = document.getElementById("enableNotifBtn");
  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      const ok = await initNotifications();
      if (ok) renderNotifSettings(containerId); // Re-render
    });
  }

  // Toggle handlers
  const toggles = [
    "notifDailyReminder",
    "notifNewMessage",
    "notifMemberJoined",
  ];
  toggles.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", async () => {
        const newPrefs = {
          dailyReminder:
            document.getElementById("notifDailyReminder")?.checked ?? true,
          reminderHour:
            parseInt(document.getElementById("notifReminderHour")?.value) || 20,
          newMessage:
            document.getElementById("notifNewMessage")?.checked ?? true,
          memberJoined:
            document.getElementById("notifMemberJoined")?.checked ?? true,
        };
        await saveNotifPrefs(newPrefs);

        // Show/hide reminder hour
        const hourRow = document.getElementById("reminderHourRow");
        if (hourRow)
          hourRow.style.display = newPrefs.dailyReminder ? "" : "none";
      });
    }
  });

  const hourSelect = document.getElementById("notifReminderHour");
  if (hourSelect) {
    hourSelect.addEventListener("change", async () => {
      const newPrefs = {
        dailyReminder:
          document.getElementById("notifDailyReminder")?.checked ?? true,
        reminderHour: parseInt(hourSelect.value) || 20,
        newMessage: document.getElementById("notifNewMessage")?.checked ?? true,
        memberJoined:
          document.getElementById("notifMemberJoined")?.checked ?? true,
      };
      await saveNotifPrefs(newPrefs);
    });
  }
}
