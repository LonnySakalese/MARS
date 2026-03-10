const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ============================================
// HELPER: Send push to a user's FCM tokens
// ============================================
async function sendPushToUser(uid, notification, data = {}) {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];
    if (tokens.length === 0) return;

    // Check user notification preferences
    const prefs = userData.notifPrefs || {};

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        type: data.type || "general",
        ...data,
      },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await db
          .collection("users")
          .doc(uid)
          .update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
          });
        console.log(
          `Cleaned ${invalidTokens.length} invalid tokens for ${uid}`,
        );
      }
    }

    console.log(
      `Push sent to ${uid}: ${response.successCount} success, ${response.failureCount} failures`,
    );
  } catch (error) {
    console.error(`Push error for ${uid}:`, error);
  }
}

// ============================================
// 1. NEW MESSAGE IN GROUP CHAT
// ============================================
exports.onNewMessage = functions.firestore
  .document("groups/{groupId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const { groupId } = context.params;
    const message = snap.data();
    const senderId = message.senderId;
    const senderName = message.senderName || "Quelqu'un";

    // Get group info
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) return;
    const group = groupDoc.data();
    const groupName = group.name || "Groupe";

    // Get all group members
    const membersSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();

    const body =
      message.type === "audio"
        ? "🎤 Message vocal"
        : (message.text || "").substring(0, 100);

    // Send to all members except sender
    const promises = membersSnap.docs
      .filter((m) => m.id !== senderId)
      .map(async (memberDoc) => {
        const uid = memberDoc.id;

        // Check if user has newMessage notifications enabled
        const userDoc = await db.collection("users").doc(uid).get();
        const prefs = userDoc.data()?.notifPrefs || {};
        if (prefs.newMessage === false) return; // Explicitly disabled

        return sendPushToUser(
          uid,
          {
            title: `💬 ${groupName}`,
            body: `${senderName}: ${body}`,
          },
          { type: "newMessage", groupId },
        );
      });

    await Promise.all(promises);
  });

// ============================================
// 2. NEW CHALLENGE CREATED (always notified)
// ============================================
exports.onNewChallenge = functions.firestore
  .document("groups/{groupId}/challenges/{challengeId}")
  .onCreate(async (snap, context) => {
    const { groupId } = context.params;
    const challenge = snap.data();
    const creatorId = challenge.creatorId;
    const challengeName = challenge.name || "Nouveau challenge";
    const duration = challenge.duration || "?";

    // Get group info
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) return;
    const group = groupDoc.data();
    const groupName = group.name || "Groupe";

    // Get all group members
    const membersSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();

    // Send to all members except creator (ALWAYS — not toggleable)
    const promises = membersSnap.docs
      .filter((m) => m.id !== creatorId)
      .map((memberDoc) => {
        return sendPushToUser(
          memberDoc.id,
          {
            title: `⚔️ Nouveau Challenge !`,
            body: `${challengeName} (${duration}j) dans ${groupName}`,
          },
          { type: "newChallenge", groupId },
        );
      });

    await Promise.all(promises);
  });

// ============================================
// 3. CHALLENGE RESULT (status changes to 'ended')
// ============================================
exports.onChallengeUpdate = functions.firestore
  .document("groups/{groupId}/challenges/{challengeId}")
  .onUpdate(async (change, context) => {
    const { groupId, challengeId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to 'ended'
    if (before.status === after.status || after.status !== "ended") return;

    const challengeName = after.name || "Challenge";

    // Get group info
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) return;
    const group = groupDoc.data();
    const groupName = group.name || "Groupe";

    // Get participants
    const participantsSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("challenges")
      .doc(challengeId)
      .collection("participants")
      .get();

    // Send to all participants (ALWAYS — not toggleable)
    const promises = participantsSnap.docs.map((pDoc) => {
      return sendPushToUser(
        pDoc.id,
        {
          title: `🏆 Challenge terminé !`,
          body: `${challengeName} dans ${groupName} — Voir les résultats`,
        },
        { type: "challengeResult", groupId },
      );
    });

    await Promise.all(promises);
  });

// ============================================
// 4. NEW MEMBER JOINED GROUP
// ============================================
exports.onMemberJoined = functions.firestore
  .document("groups/{groupId}/members/{memberId}")
  .onCreate(async (snap, context) => {
    const { groupId, memberId } = context.params;
    const memberData = snap.data();

    // Get group info
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) return;
    const group = groupDoc.data();
    const groupName = group.name || "Groupe";
    const creatorId = group.creatorId;

    // Get new member's name
    const userDoc = await db.collection("users").doc(memberId).get();
    const userName = userDoc.data()?.pseudo || "Quelqu'un";

    // Get all existing members
    const membersSnap = await db
      .collection("groups")
      .doc(groupId)
      .collection("members")
      .get();

    // Notify all existing members except the new one
    const promises = membersSnap.docs
      .filter((m) => m.id !== memberId)
      .map(async (mDoc) => {
        const uid = mDoc.id;

        // Check pref (toggleable)
        const uDoc = await db.collection("users").doc(uid).get();
        const prefs = uDoc.data()?.notifPrefs || {};
        if (prefs.memberJoined === false) return;

        return sendPushToUser(
          uid,
          {
            title: `👥 ${groupName}`,
            body: `${userName} a rejoint le groupe !`,
          },
          { type: "memberJoined", groupId },
        );
      });

    await Promise.all(promises);
  });

// ============================================
// 5. DAILY REMINDER (Scheduled — runs at 20:00 UTC+1)
// ============================================
exports.dailyReminder = functions.pubsub
  .schedule("0 19 * * *") // 19h UTC = 20h Paris
  .timeZone("Europe/Paris")
  .onRun(async () => {
    const today = new Date().toISOString().split("T")[0];

    // Get all users with dailyReminder enabled
    const usersSnap = await db.collection("users").get();

    const promises = usersSnap.docs.map(async (userDoc) => {
      const data = userDoc.data();
      const prefs = data.notifPrefs || {};

      // Skip if daily reminder disabled
      if (prefs.dailyReminder === false) return;

      // Check if user has FCM tokens
      if (!data.fcmTokens || data.fcmTokens.length === 0) return;

      // TODO: Check if user already validated today
      // (would need to read their history, skip for now — just send)

      return sendPushToUser(
        userDoc.id,
        {
          title: "⚡ PROJET MARS",
          body: "N'oublie pas de valider ta journée ! 💪",
        },
        { type: "dailyReminder" },
      );
    });

    await Promise.all(promises);
    console.log(`Daily reminder sent to ${usersSnap.size} users checked`);
  });
