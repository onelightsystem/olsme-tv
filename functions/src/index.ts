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
import {FieldValue, getFirestore, QueryDocumentSnapshot, DocumentData} from "firebase-admin/firestore";
import {CallableRequest, onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2/options";

initializeApp();
const db = getFirestore();

const allowedCorsOrigins = "*";

const callableCorsOrigins = allowedCorsOrigins;

// Apply shared runtime defaults for all v2 functions in this file.
setGlobalOptions({
  region: "us-central1",
  invoker: "public",
});

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

type PaypalOrderResponse = {
  status?: string;
  purchase_units?: Array<{
    amount?: {
      value?: string;
      currency_code?: string;
    };
  }>;
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

  const order = await response.json() as PaypalOrderResponse;

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

const setInitialAdminClaim = async (user: UserRecord) => {
  if (user.email === ADMIN_EMAIL && !user.customClaims?.isAdmin) {
    functions.logger.info(`Setting admin claim for ${user.uid}`);
    await getAuth().setCustomUserClaims(user.uid, {...user.customClaims, isAdmin: true});
    return true;
  }
  return false;
};

export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  await setInitialAdminClaim(user);
});

export const setAdminClaim = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{uid?: string}>) => {
  const caller = request.auth;
  if (!caller) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const callerRecord = await getAuth().getUser(caller.uid);
  if (callerRecord.customClaims?.isAdmin !== true) {
    throw new HttpsError("permission-denied", "Admin access only.");
  }

  const uid = request.data?.uid;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "A valid uid is required.");
  }

  const targetUser = await getAuth().getUser(uid);
  const existingClaims = targetUser.customClaims || {};

  await getAuth().setCustomUserClaims(uid, {
    ...existingClaims,
    isAdmin: true,
  });

  await db.collection("logs").add({
    userId: caller.uid,
    action: "setAdminClaim",
    details: {
      targetUid: uid,
    },
    timestamp: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: `Admin claim set for user ${uid}.`,
    uid,
  };
});

export const setMyAdminClaim = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<Record<string, never>>) => {
  const caller = request.auth;
  if (!caller) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const callerRecord = await getAuth().getUser(caller.uid);
  if (callerRecord.customClaims?.isAdmin !== true) {
    throw new HttpsError("permission-denied", "Admin access only.");
  }

  const existingClaims = callerRecord.customClaims || {};
  await getAuth().setCustomUserClaims(caller.uid, {
    ...existingClaims,
    isAdmin: true,
  });

  await db.collection("admin_logs").add({
    actorUid: caller.uid,
    action: "setMyAdminClaim",
    timestamp: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "Admin claim set on self",
  };
});

export const upgradeToPremium = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const uid = auth.uid;
  const userRef = db.collection("users").doc(uid);
  try {
    await userRef.update({package: "premium"});
    const existingClaims = (await getAuth().getUser(uid)).customClaims || {};
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

export const setPolitenessClaim = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<unknown>) => {
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
  cors: allowedCorsOrigins
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

export const searchUsers = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{ query?: string; verificationLevel?: string }>) => {
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

export const updateUserStatus = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{ status: string }>) => {
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

export const updateSubscriptionStatus = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{tier: string; paypalOrderId?: string | null}>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const data = request.data ?? {tier: ""};
  const tier = data.tier;
  if (tier !== "tier1" && tier !== "tier2") {
    throw new HttpsError("invalid-argument", "tier must be \"tier1\" or \"tier2\".");
  }

  // TODO: Verify the PayPal order server-side before activating the subscription.
  // The paypalOrderId provided by the client should be validated against the PayPal
  // Orders API (amount, currency, capture status, and replay protection) to prevent
  // unauthenticated self-upgrades. Until server-side PayPal verification is implemented,
  // monitor logs for abuse and restrict callable access via Firebase App Check.
  const paypalOrderId = data.paypalOrderId;
  if (!paypalOrderId) {
    throw new HttpsError("invalid-argument", "A valid paypalOrderId is required to activate a subscription.");
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

export const sendAdminEmail = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{ userId: string; displayName: string; email: string }>) => {
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

export const getAllUsers = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<unknown>) => {
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
        id: document.id,
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

export const getVerificationQueue = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Must be an admin to access verification data.");
  }
  try {
    const usersSnapshot = await db.collection("users").limit(250).get();
    const users = usersSnapshot.docs.map((document: QueryDocumentSnapshot<DocumentData>) => {
      const data = document.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
      const verificationLevel = typeof data.verificationLevel === "string" ? data.verificationLevel : "level1";
      const pendingVerificationLevel = typeof data.pendingVerificationLevel === "string" ? data.pendingVerificationLevel : null;
      return {
        id: document.id,
        displayName: typeof data.displayName === "string" ? data.displayName : "Unknown user",
        email: typeof data.email === "string" ? data.email : "No email",
        verificationLevel,
        pendingVerificationLevel,
        createdAt,
      };
    });
    await db.collection("logs").add({
      userId: auth.uid,
      action: "getVerificationQueue",
      resultsCount: users.length,
      timestamp: FieldValue.serverTimestamp(),
    });
    return {users};
  } catch (error) {
    functions.logger.error("Error fetching verification queue:", error);
    throw new HttpsError("internal", "Failed to fetch verification queue.");
  }
});

export const rateGuest = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<unknown>) => {
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

/**
 * Creates a PayPal order server-side using the PayPal Orders v2 API.
 * Returns the order ID for use by the frontend PayPal button.
 */
export const createPaypalOrder = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{
  amount: string;
  tier: string;
  period: string;
}>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const data = request.data ?? {};
  const amount = data.amount as string | undefined;
  const tier = data.tier as string | undefined;
  const period = data.period as string | undefined;

  if (!amount || isNaN(parseFloat(amount))) {
    throw new HttpsError("invalid-argument", "Invalid amount.");
  }
  if (tier !== "tier1" && tier !== "tier2") {
    throw new HttpsError("invalid-argument", "tier must be \"tier1\" or \"tier2\".");
  }
  if (period !== "monthly" && period !== "annual") {
    throw new HttpsError("invalid-argument", "period must be \"monthly\" or \"annual\".");
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiBase = process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";

  if (!clientId || !clientSecret) {
    functions.logger.error("PayPal credentials are not configured.");
    throw new HttpsError("failed-precondition", "Payment service is not configured.");
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tierLabel = tier === "tier2" ? "Premium" : "Starter";
  const periodLabel = period === "annual" ? "12-month plan (one-time payment)" : "30-day access (one-time, non-recurring)";

  try {
    const response = await fetch(`${apiBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount,
            },
            description: `olsme.tv ${tierLabel} – ${periodLabel}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      functions.logger.error(`PayPal create order failed: ${response.status} ${errorText}`);
      throw new HttpsError("internal", "Failed to create PayPal order.");
    }

    const order = await response.json() as { id?: string };
    const orderId = order.id;
    if (!orderId) {
      functions.logger.error("PayPal returned order without ID");
      throw new HttpsError("internal", "Invalid PayPal response.");
    }

    functions.logger.info(`Created PayPal order ${orderId} for user ${auth.uid} (tier=${tier}, amount=${amount})`);
    return {orderID: orderId};
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    functions.logger.error("Error creating PayPal order:", error);
    throw new HttpsError("internal", "Failed to create PayPal order.");
  }
});

/**
 * Captures a PayPal order server-side and sets the user's premium status.
 * Calls verifyPaypalOrder and markPaypalOrderUsed to ensure payment validity.
 */
export const capturePaypalOrder = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<{
  orderId: string;
  tier: string;
  period: string;
}>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const data = request.data ?? {};
  const orderId = data.orderId as string | undefined;
  const tier = data.tier as string | undefined;
  const period = data.period as string | undefined;

  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "Invalid orderId.");
  }
  if (tier !== "tier1" && tier !== "tier2") {
    throw new HttpsError("invalid-argument", "tier must be \"tier1\" or \"tier2\".");
  }
  if (period !== "monthly" && period !== "annual") {
    throw new HttpsError("invalid-argument", "period must be \"monthly\" or \"annual\".");
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiBase = process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";

  if (!clientId || !clientSecret) {
    functions.logger.error("PayPal credentials are not configured.");
    throw new HttpsError("failed-precondition", "Payment service is not configured.");
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const uid = auth.uid;

  try {
    // Capture the PayPal order
    const response = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      functions.logger.error(`PayPal capture failed for order ${orderId}: ${response.status} ${errorText}`);
      throw new HttpsError("permission-denied", "Failed to capture PayPal order.");
    }

    const captured = await response.json() as { status?: string };
    if (captured.status !== "COMPLETED") {
      functions.logger.warn(`PayPal order ${orderId} capture status: ${captured.status}`);
      throw new HttpsError("failed-precondition", "PayPal order capture was not completed.");
    }

    // Update subscription status (verifies the order and sets premium claim)
    const userRef = db.collection("users").doc(uid);
    const packageName = tier === "tier2" ? "premium" : "starter";

    // Verify the order (second verification check)
    await verifyPaypalOrder(orderId, tier);

    // Mark the order as used (replay protection)
    await markPaypalOrderUsed(orderId, uid, tier);

    // Update Firestore
    await userRef.set({
      subscriptionTier: tier,
      subscriptionStatus: "active",
      status: "active",
      startDate: FieldValue.serverTimestamp(),
      package: packageName,
      paypalOrderId: orderId,
    }, {merge: true});

    // Set custom claims for premium access
    const existingClaims = (await getAuth().getUser(uid)).customClaims || {};
    await getAuth().setCustomUserClaims(uid, {
      ...existingClaims,
      isPremium: tier === "tier2",
      subscriptionTier: tier,
    });

    await db.collection("logs").add({
      userId: uid,
      action: "capturePaypalOrder",
      details: {orderId, tier, period},
      timestamp: FieldValue.serverTimestamp(),
    });

    functions.logger.info(`Captured order ${orderId} and set premium status for user ${uid}`);
    return {success: true, tier, status: "active"};
  } catch (error) {
    if (error instanceof HttpsError) {
      functions.logger.warn(`Capture failed for order ${orderId} by user ${uid}:`, error.message);
      throw error;
    }
    functions.logger.error(`Error capturing PayPal order ${orderId} for user ${uid}:`, error);
    throw new HttpsError("internal", "Failed to process payment.");
  }
});

/**
 * Webhook handler for PayPal webhook events (backup verification).
 * Verifies webhook signature and handles PAYMENT.CAPTURE.COMPLETED events.
 */
export const paypalWebhook = onRequest({cors: allowedCorsOrigins}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const apiBase = process.env.PAYPAL_API_BASE || "https://api-m.paypal.com";

  if (!clientId || !clientSecret) {
    functions.logger.error("PayPal webhook: credentials not configured");
    res.status(500).json({error: "Webhook service not configured"});
    return;
  }

  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  try {
    // Verify webhook signature with PayPal
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      functions.logger.warn("PayPal webhook: PAYPAL_WEBHOOK_ID not configured, skipping signature verification");
      // Log event for manual review
      functions.logger.info("Webhook event received (unverified)", req.body);
      res.status(202).send("");
      return;
    }

    const verifyResponse = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        transmission_id: req.header("paypal-transmission-id"),
        transmission_time: req.header("paypal-transmission-time"),
        cert_url: req.header("paypal-cert-url"),
        auth_algo: req.header("paypal-auth-algo"),
        transmission_sig: req.header("paypal-transmission-sig"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    const verifyBody = await verifyResponse.json() as {verification_status?: string};
    if (verifyBody.verification_status !== "SUCCESS") {
      functions.logger.warn("PayPal webhook signature verification failed");
      res.status(401).json({error: "Signature verification failed"});
      return;
    }

    // Handle the webhook event
    const event = JSON.parse(body) as {
      event_type?: string;
      resource?: {
        id?: string;
        status?: string;
        custom_id?: string;
      };
    };

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && event.resource) {
      const orderId = event.resource.id;
      const status = event.resource.status;
      functions.logger.info(`Webhook: PAYMENT.CAPTURE.COMPLETED for order ${orderId}, status=${status}`);
      // Log for manual reconciliation if needed
      await db.collection("webhooks").add({
        event: event.event_type,
        orderId,
        status,
        timestamp: FieldValue.serverTimestamp(),
      });
    } else {
      functions.logger.info(`Webhook: Received event type ${event.event_type}`);
    }

    res.status(200).json({received: true});
  } catch (error) {
    functions.logger.error("Error processing PayPal webhook:", error);
    res.status(500).json({error: "Internal error"});
  }
});

export const getNotifications = onCall({cors: callableCorsOrigins}, async (request: CallableRequest<unknown>) => {
  const auth = request.auth;
  if (!auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Must be an admin to access notification data.");
  }
  try {
    const snapshot = await db.collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(250)
      .get();
    const notifications = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString()
        : data.timestamp?.toDate ? data.timestamp.toDate().toISOString()
        : null;
      return {
        id: docSnap.id,
        title: typeof data.title === "string" ? data.title : "Untitled notification",
        message: typeof data.message === "string" ? data.message : "",
        targetUsers: typeof data.targetUsers === "string" ? data.targetUsers : "All Users",
        createdAt,
      };
    });
    return {notifications};
  } catch (error) {
    functions.logger.error("Error fetching notifications:", error);
    throw new HttpsError("internal", "Failed to fetch notifications.");
  }
});

async function generateDecentralizedId(uid: string): Promise<string> {
  // TODO: Integrate Polygon/IPFS for decentralized user IDs
  return `ipfs://${uid}`;
}
