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
import {initializeApp} from "firebase-admin/app";
import {getAuth, UserRecord} from "firebase-admin/auth";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {CallableRequest, onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import fetch from "node-fetch";

initializeApp();
const db = getFirestore();

const ADMIN_EMAIL = "info@olsme.com";

/**
 * Returns the expected PayPal amount and currency for a given subscription tier.
 * Values can be configured via environment variables; if not configured, amount
 * validation is skipped but status verification still occurs.
 */
const getExpectedPaypalAmountForTier = (tier: string): {value: string; currency_code: string} | null => {
  // Environment variables allow configuring prices without code changes.
  if (tier === "tier1") {
    const value = process.env.PAYPAL_TIER1_AMOUNT;
    const currency = process.env.PAYPAL_TIER1_CURRENCY;
    if (value && currency) {
      return {value, currency_code: currency};
    }
    return null;
  }
  if (tier === "tier2") {
    const value = process.env.PAYPAL_TIER2_AMOUNT;
    const currency = process.env.PAYPAL_TIER2_CURRENCY;
    if (value && currency) {
      return {value, currency_code: currency};
    }
    return null;
  }
  return null;
};

/**
 * Verifies a PayPal order server-side using the PayPal Orders v2 API.
 * - Authenticates with PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.
 * - Ensures the order status is COMPLETED.
 * - Optionally validates amount and currency against the expected tier configuration.
 */
const verifyPaypalOrder = async (orderId: string, tier: string): Promise<void> => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiBase = process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";

  if (!clientId || !clientSecret) {
    functions.logger.error("PayPal client credentials are not configured in environment variables.");
    throw new HttpsError("failed-precondition", "Payment verification is not configured.");
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = `${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}`;

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
    });
  } catch (err) {
    functions.logger.error("Error calling PayPal Orders API", err);
    throw new HttpsError("internal", "Failed to verify payment with PayPal.");
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    functions.logger.error(`PayPal Orders API responded with status ${response.status}: ${bodyText}`);
    throw new HttpsError("permission-denied", "Unable to verify PayPal order.");
  }

  const order: any = await response.json();

  const status = order.status;
  if (status !== "COMPLETED") {
    functions.logger.warn(`PayPal order ${orderId} has non-completed status: ${status}`);
    throw new HttpsError("failed-precondition", "Payment has not been completed.");
  }

  const expected = getExpectedPaypalAmountForTier(tier);
  const purchaseUnit = Array.isArray(order.purchase_units) ? order.purchase_units[0] : undefined;
  const amount = purchaseUnit?.amount;

  if (expected && amount) {
    const actualValue = amount.value;
    const actualCurrency = amount.currency_code;
    if (actualValue !== expected.value || actualCurrency !== expected.currency_code) {
      functions.logger.error(
          `PayPal order ${orderId} amount mismatch. Expected ${expected.value} ${expected.currency_code},` +
          ` got ${actualValue} ${actualCurrency}`
      );
      throw new HttpsError("permission-denied", "Payment amount or currency is invalid for this tier.");
    }
  } else if (!expected) {
    // Amount validation is skipped if not configured, but this is logged for visibility.
    functions.logger.warn(
        `Expected PayPal amount not configured for tier "${tier}". Skipping amount validation for order ${orderId}.`
    );
  }
};

/**
 * Marks a PayPal order as used in Firestore to provide replay protection.
 * If the orderId document already exists, the order is treated as already consumed.
 */
const markPaypalOrderUsed = async (orderId: string, uid: string, tier: string): Promise<void> => {
  const orderRef = db.collection("paypalOrders").doc(orderId);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(orderRef);
    if (snapshot.exists) {
      functions.logger.warn(`Attempted reuse of PayPal orderId ${orderId} by user ${uid}`);
      throw new HttpsError("already-exists", "This PayPal order has already been used.");
    }
    tx.set(orderRef, {
      uid,
      tier,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
};

const setAdminClaim = async (user: UserRecord) => {
  if (user.email === ADMIN_EMAIL && !user.customClaims?.isAdmin) {
    functions.logger.info(`Setting admin claim for ${user.uid}`);
    await getAuth().setCustomUserClaims(user.uid, {...user.customClaims, isAdmin: true});
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
    const userRecord = await getAuth().getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await getAuth().setCustomUserClaims(uid, {...existingClaims, isPremium: true});
    functions.logger.info(`User ${uid} successfully upgraded to premium.`);
    await db.collection("logs").add({
      userId: uid,
      action: "upgradeToPremium",
      timestamp: FieldValue.serverTimestamp()
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
  const existingClaims = (await getAuth().getUser(uid)).customClaims || {};
  try {
    await getAuth().setCustomUserClaims(uid, {
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
      timestamp: FieldValue.serverTimestamp()
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
      timestamp: FieldValue.serverTimestamp()
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
      timestamp: FieldValue.serverTimestamp()
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
      last_changed: FieldValue.serverTimestamp()
    });
    await db.collection("logs").add({
      userId: uid,
      action: "updateUserStatus",
      details: {status},
      timestamp: FieldValue.serverTimestamp()
    });
    return {success: true};
  } catch (error) {
    functions.logger.error(`Failed to update status for user ${uid}`, error);
    throw new HttpsError("internal", "Could not update user status.");
  }
});

export const updateSubscriptionStatus = onCall(async (request: CallableRequest<{tier: string; paypalOrderId?: string | null}>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const data = request.data ?? {tier: ""};
  const tier = data.tier;
  if (tier !== "tier1" && tier !== "tier2") {
    throw new HttpsError("invalid-argument", "tier must be \"tier1\" or \"tier2\".");
  }

  const uid = auth.uid;
  const userRef = db.collection("users").doc(uid);
  const packageName = tier === "tier2" ? "premium" : "starter";

  // Determine if the caller has admin privileges and may bypass PayPal verification.
  const isAdminCaller = auth.token?.isAdmin === true || auth.token?.email === ADMIN_EMAIL;

  try {
    const paypalOrderId = data.paypalOrderId ?? null;

    // For non-admin callers, require a valid, server-verified, unused PayPal order.
    if (!isAdminCaller) {
      if (!paypalOrderId) {
        throw new HttpsError("invalid-argument", "paypalOrderId is required to update subscription status.");
      }

      // 1) Verify the PayPal order server-side.
      await verifyPaypalOrder(paypalOrderId, tier);

      // 2) Mark the PayPal order as used to prevent replay.
      await markPaypalOrderUsed(paypalOrderId, uid, tier);
    }

    await userRef.set({
      subscriptionTier: tier,
      subscriptionStatus: "active",
      status: "active",
      startDate: FieldValue.serverTimestamp(),
      package: packageName,
      paypalOrderId,
    }, {merge: true});

    const existingClaims = (await getAuth().getUser(uid)).customClaims || {};
    await getAuth().setCustomUserClaims(uid, {
      ...existingClaims,
      isPremium: tier === "tier2",
      subscriptionTier: tier,
    });

    await db.collection("logs").add({
      userId: uid,
      action: "updateSubscriptionStatus",
      details: {tier, paypalOrderId},
      timestamp: FieldValue.serverTimestamp(),
    });

    return {success: true, tier, status: "active"};
  } catch (error) {
    functions.logger.error(`Failed to update subscription status for user ${uid}`, error);
    if (error instanceof HttpsError) {
      // Re-throw known errors without wrapping.
      throw error;
    }
    throw new HttpsError("internal", "Could not update subscription status.");
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
      timestamp: FieldValue.serverTimestamp()
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
      timestamp: FieldValue.serverTimestamp()
    });
    return {users};
  } catch (error) {
    functions.logger.error("Error fetching all users:", error);
    throw new HttpsError("internal", "Failed to fetch users.");
  }
});

export const rateGuest = onCall(async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  const data = request.data;
  if (data === null || data === undefined || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Invalid guest ID or rating.");
  }
  const payload = data as Record<string, unknown>;
  if (
    typeof payload.guestId !== "string" ||
    !payload.guestId ||
    typeof payload.rating !== "string" ||
    !["good", "bad"].includes(payload.rating)
  ) {
    throw new HttpsError("invalid-argument", "Invalid guest ID or rating.");
  }
  const {guestId, rating} = payload as { guestId: string; rating: string };
  try {
    await db.collection("ratings").add({
      userId: auth.uid,
      guestId,
      rating,
      timestamp: FieldValue.serverTimestamp()
    });
    await db.collection("logs").add({
      userId: auth.uid,
      action: "rateGuest",
      details: {guestId, rating},
      timestamp: FieldValue.serverTimestamp()
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
