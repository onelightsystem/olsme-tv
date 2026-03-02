// Path: functions/src/index.ts
// Improvements (Oct 2, 2025):
// - Fixed TypeScript errors for Firebase Functions v2 compatibility.
// - Updated to use CallableRequest and v2.auth for user authentication.
// - Enhanced setPolitenessClaim with TensorFlow Lite stub for sentiment analysis.
// - Added IPFS/Polygon stub for decentralized IDs.
// - Added Firestore logging for solo progress tracking.
// - Improved error handling for prototype testing.
import * as functions from "firebase-functions/v2";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {CallableRequest, onCall, onRequest, HttpsError} from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

const ADMIN_EMAIL = "info@olsme.com";

const setAdminClaim = async (user: admin.auth.UserRecord) => {
  if (user.email === ADMIN_EMAIL && !user.customClaims?.isAdmin) {
    functions.logger.info(`Setting admin claim for ${user.uid}`);
    await admin.auth().setCustomUserClaims(user.uid, {...user.customClaims, isAdmin: true});
    return true;
  }
  return false;
};

export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  await setAdminClaim(user);
});

export const upgradeToPremium = onCall(async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const uid = auth.uid;
  const userRef = db.collection("users").doc(uid);
  try {
    await userRef.update({package: "premium"});
    await admin.auth().setCustomUserClaims(uid, {...auth.token, isPremium: true});
    functions.logger.info(`User ${uid} successfully upgraded to premium.`);
    await db.collection("logs").add({
      userId: uid,
      action: "upgradeToPremium",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {success: true, message: "Successfully upgraded to premium."};
  } catch (error) {
    functions.logger.error(`Error upgrading user ${uid} to premium:`, error);
    throw new HttpsError("internal", "An error occurred while upgrading the account.");
  }
});

export const setPolitenessClaim = onCall(async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const uid = auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  const userData = userDoc.data();
  if (!userData) {
    throw new HttpsError("internal", "User data is missing.");
  }
  const score = userData.politenessScore || {ethical: 0, communication: 0, listener: 0, topics: 0};
  const sentimentScore = await analyzeSentiment(userData.recentChats || []);
  const average = (score.ethical + score.communication + score.listener + score.topics + sentimentScore) / 5;
  let politenessLevel = "bronze";
  if (average >= 80) {
    politenessLevel = "gold";
  } else if (average >= 60) {
    politenessLevel = "silver";
  }
  const verificationLevel = userData.verificationLevel || "level1";
  const decentralizedId = await generateDecentralizedId(uid);
  const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
  try {
    await admin.auth().setCustomUserClaims(uid, {
      ...existingClaims,
      politenessLevel,
      verificationLevel,
      decentralizedId
    });
    functions.logger.info(`Claims set for user ${uid}: politenessLevel=${politenessLevel}, verificationLevel=${verificationLevel}, decentralizedId=${decentralizedId}`);
    await db.collection("logs").add({
      userId: uid,
      action: "setPolitenessClaim",
      details: {politenessLevel, verificationLevel, decentralizedId},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {success: true, politenessLevel, verificationLevel, decentralizedId};
  } catch (error) {
    functions.logger.error(`Error setting claims for user ${uid}:`, error);
    throw new HttpsError("internal", "An error occurred while setting custom claims.");
  }
});

export const matchUsers = onRequest({
  cors: [
    "http://localhost:9002",
    "https://studio-4615914296-4bd91.web.app",
    "https://olsme.tv",
    /^https:\/\/[a-z0-9-]+\.olsme\.tv$/
  ]
}, async (_req, res): Promise<void> => {
  try {
    const users = await db
      .collection("users")
      .where("politenessScore.communication", ">", 80)
      .get();
    const matchedUsers = users.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName
      };
    });
    await db.collection("logs").add({
      action: "matchUsers",
      resultsCount: matchedUsers.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(200).json({matchedUsers});
    return;
  } catch (error) {
    functions.logger.error("Error matching users", {error});
    res.status(500).json({error: "Internal server error"});
    return;
  }
});

export const searchUsers = onCall(async (request: CallableRequest<{ query?: string; verificationLevel?: string }>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to search for users.");
  }
  const data = request.data || {};
  const {query, verificationLevel} = data;
  const normalizedQuery = (query || "").trim().toLowerCase();
  let userQuery: FirebaseFirestore.Query = db.collection("users");
  if (normalizedQuery) {
    userQuery = userQuery
      .where("displayName_lowercase", ">=", normalizedQuery)
      .where("displayName_lowercase", "<=", normalizedQuery + "\uf8ff");
  }
  if (verificationLevel && verificationLevel !== "all") {
    userQuery = userQuery.where("verificationLevel", "==", verificationLevel);
  }
  if (!normalizedQuery && !verificationLevel) {
    userQuery = userQuery.limit(10);
  }
  try {
    const snapshot = await userQuery.limit(20).get();
    const users = snapshot.docs
      .map((document) => {
        const {uid, displayName, package: userPackage, verificationLevel: userVerificationLevel} = document.data();
        return {uid, displayName, package: userPackage, verificationLevel: userVerificationLevel};
      })
      .filter(user => user.uid !== auth.uid);
    await db.collection("logs").add({
      userId: auth.uid,
      action: "searchUsers",
      query: data,
      resultsCount: users.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {users};
  } catch (error) {
    functions.logger.error("Error searching users:", error);
    throw new HttpsError("internal", "An error occurred while searching for users.");
  }
});

export const updateUserStatus = onCall(async (request: CallableRequest<{ status: string }>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  const data = request.data ?? {};
  const {status} = data;
  const uid = auth.uid;
  if (typeof status !== "string" || !["online", "offline"].includes(status)) {
    throw new HttpsError("invalid-argument", "Status must be 'online' or 'offline'.");
  }
  const userStatusRef = db.collection("user_status").doc(uid);
  try {
    await userStatusRef.set({
      status,
      last_changed: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("logs").add({
      userId: uid,
      action: "updateUserStatus",
      details: {status},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {success: true};
  } catch (error) {
    functions.logger.error(`Failed to update status for user ${uid}`, error);
    throw new HttpsError("internal", "Could not update user status.");
  }
});

export const sendAdminEmail = onCall(async (request: CallableRequest<{ userId: string; displayName: string; email: string }>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  const data = request.data;
  if (
    !data ||
    typeof data.userId !== "string" || data.userId.trim().length === 0 ||
    typeof data.displayName !== "string" || data.displayName.trim().length === 0 ||
    typeof data.email !== "string" || data.email.trim().length === 0
  ) {
    throw new HttpsError("invalid-argument", "Missing or invalid required fields: userId, displayName, email.");
  }
  const {userId, displayName, email} = data;
  const logMessage = {
    to: ADMIN_EMAIL,
    from: "system@olsme.tv",
    subject: `KYC Verification Request from ${displayName}`,
    body: `User ${displayName} (UID: ${userId}, Email: ${email}) has requested Level 3 KYC verification.`,
    timestamp: new Date()
  };
  try {
    await db.collection("mail").add(logMessage);
    functions.logger.info(`Simulated email for KYC request for user ${userId}.`);
    await db.collection("logs").add({
      userId: auth.uid,
      action: "sendAdminEmail",
      details: `KYC request for ${userId}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {success: true, message: "Verification request sent."};
  } catch (error) {
    functions.logger.error(`Failed to send admin email for user ${userId}`, error);
    throw new HttpsError("internal", "Could not process the verification request.");
  }
});

export const getAllUsers = onCall(async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Must be an admin to access user data.");
  }
  try {
    const [usersSnapshot, statusSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("user_status").where("status", "==", "online").get()
    ]);
    const onlineUsers = new Set(statusSnapshot.docs.map((document) => document.id));
    const users = usersSnapshot.docs.map((document) => {
      const userData = document.data();
      const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : null;
      return {
        ...userData,
        createdAt,
        status: onlineUsers.has(document.id) ? "online" : "offline"
      };
    });
    await db.collection("logs").add({
      userId: auth.uid,
      action: "getAllUsers",
      resultsCount: users.length,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {users};
  } catch (error) {
    functions.logger.error("Error fetching all users:", error);
    throw new HttpsError("internal", "Failed to fetch users.");
  }
});

export const rateGuest = onCall(async (request: CallableRequest<{ guestId: string; rating: string }>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  const data = request.data;
  const {guestId, rating} = data;
  if (!guestId || !["good", "bad"].includes(rating)) {
    throw new HttpsError("invalid-argument", "Invalid guest ID or rating.");
  }
  try {
    await admin.firestore().collection("ratings").add({
      userId: auth.uid,
      guestId,
      rating,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("logs").add({
      userId: auth.uid,
      action: "rateGuest",
      details: {guestId, rating},
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return {success: true};
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    functions.logger.error(`Error rating guest ${guestId} by user ${auth.uid}:`, error);
    throw new HttpsError("internal", `Could not process rating: ${errorMessage}`);
  }
});

async function analyzeSentiment(chats: string[]): Promise<number> {
  // TODO: Integrate Firebase ML Kit with TensorFlow Lite for real-time sentiment analysis
  const mockScore = chats.length > 0 ? 70 : 50;
  return mockScore;
}

async function generateDecentralizedId(uid: string): Promise<string> {
  // TODO: Integrate Polygon/IPFS for decentralized user IDs
  return `ipfs://${uid}`;
}
