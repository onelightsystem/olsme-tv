// Path: functions/src/index.ts
// Improvements (Oct 2, 2025):
// - Added `setPolitenessClaim` Cloud Function to set custom claims based on politeness and verification.
// - This function is callable from the client after a score update.
// - It calculates the politeness level (Bronze, Silver, Gold) and sets it as a custom claim.
// - It also reads the user's verificationLevel and sets it as a claim.
// - Added `searchUsers` Cloud Function for case-insensitive displayName search and verification level filtering.

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({
  origin: [
    "http://localhost:9002",
    "https://studio-4615914296-4bd91.web.app",
    "https://olsme.tv",
    /^https:\/\/[a-z0-9-]+\.olsme\.tv$/
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

const ADMIN_EMAIL = "info@olsme.com";

const setAdminClaim = async (user: admin.auth.UserRecord) => {
    if (user.email === ADMIN_EMAIL && !user.customClaims?.isAdmin) {
        functions.logger.info(`Setting admin claim for ${user.uid}`);
        await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: true });
        return true;
    }
    return false;
};

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    await setAdminClaim(user);
});


export const upgradeToPremium = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    const uid = context.auth.uid;
    const userRef = db.collection('users').doc(uid);

    try {
        await userRef.update({ package: 'premium' });

        // Set custom auth claim.
        await admin.auth().setCustomUserClaims(uid, { ...context.auth.token, isPremium: true });

        functions.logger.info(`User ${uid} successfully upgraded to premium.`);
        
        return { success: true, message: "Successfully upgraded to premium." };

    } catch (error) {
        functions.logger.error(`Error upgrading user ${uid} to premium:`, error);
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while upgrading the account.'
        );
    }
});


export const setPolitenessClaim = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The function must be called while authenticated.'
        );
    }

    const uid = context.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }

    const userData = userDoc.data();
    if (!userData) {
      throw new functions.https.HttpsError('internal', 'User data is missing.');
    }

    const score = userData.politenessScore;
    const average = (score.ethical + score.communication + score.listener + score.topics) / 4;
    
    let politenessLevel = 'bronze';
    if (average >= 80) {
        politenessLevel = 'gold';
    } else if (average >= 60) {
        politenessLevel = 'silver';
    }

    const verificationLevel = userData.verificationLevel || 'level1';
    
    const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};

    try {
        await admin.auth().setCustomUserClaims(uid, { 
            ...existingClaims,
            politenessLevel: politenessLevel,
            verificationLevel: verificationLevel
        });
        
        functions.logger.info(`Claims set for user ${uid}: politenessLevel=${politenessLevel}, verificationLevel=${verificationLevel}`);
        return { success: true, politenessLevel, verificationLevel };

    } catch (error) {
        functions.logger.error(`Error setting claims for user ${uid}:`, error);
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while setting custom claims.'
        );
    }
});


export const matchUsers = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      const users = await db
        .collection("users")
        .where("politenessScore.communication", ">", 80) // Example query
        .get();
      
      const matchedUsers = users.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          displayName: data.displayName,
        };
      });
      
      return res.status(200).json({ matchedUsers });
    } catch (error) {
      functions.logger.error("Error matching users", { error });
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

export const searchUsers = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to search for users.'
        );
    }

    const { query, verificationLevel } = data;
    const normalizedQuery = (query || '').trim().toLowerCase();

    if (!normalizedQuery && !verificationLevel) {
        return { users: [] };
    }

    let userQuery: admin.firestore.Query = db.collection('users');

    if (normalizedQuery) {
        userQuery = userQuery
            .where('displayName_lowercase', '>=', normalizedQuery)
            .where('displayName_lowercase', '<=', normalizedQuery + '\uf8ff');
    }

    if (verificationLevel && verificationLevel !== 'all') {
        userQuery = userQuery.where('verificationLevel', '==', verificationLevel);
    }

    try {
        const snapshot = await userQuery.limit(20).get();
        const users = snapshot.docs.map(doc => {
            const { uid, displayName, package: userPackage, verificationLevel: userVerificationLevel } = doc.data();
            return { uid, displayName, package: userPackage, verificationLevel: userVerificationLevel };
        });

        await db.collection('logs').add({
            userId: context.auth.uid,
            action: 'searchUsers',
            query: data,
            resultsCount: users.length,
            timestamp: new Date(),
        });

        return { users };
    } catch (error) {
        functions.logger.error('Error searching users:', error);
        throw new functions.https.HttpsError(
            'internal',
            'An error occurred while searching for users.'
        );
    }
});

export const updateUserStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { status } = data;
    const uid = context.auth.uid;
    if (!['online', 'offline'].includes(status)) {
        throw new functions.https.HttpsError('invalid-argument', 'Status must be "online" or "offline".');
    }

    const userStatusRef = db.collection('user_status').doc(uid);
    try {
        await userStatusRef.set({
            status,
            last_changed: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        functions.logger.error(`Failed to update status for user ${uid}`, error);
        throw new functions.https.HttpsError('internal', 'Could not update user status.');
    }
});

export const sendAdminEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    
    const { userId, displayName, email } = data;
    
    // In a real app, you would integrate with an email service like SendGrid or Mailgun.
    // For this prototype, we'll log to Firestore to simulate the email.
    const logMessage = {
        to: ADMIN_EMAIL,
        from: 'system@olsme.tv',
        subject: `KYC Verification Request from ${displayName}`,
        body: `User ${displayName} (UID: ${userId}, Email: ${email}) has requested Level 3 KYC verification.`,
        timestamp: new Date(),
    };

    try {
        await db.collection('mail').add(logMessage);
        functions.logger.info(`Simulated email for KYC request for user ${userId}.`);
        
        await db.collection('logs').add({
            userId: context.auth.uid,
            action: 'sendAdminEmail',
            details: `KYC request for ${userId}`,
            timestamp: new Date(),
        });

        return { success: true, message: "Verification request sent." };
    } catch (error) {
        functions.logger.error(`Failed to send admin email for user ${userId}`, error);
        throw new functions.https.HttpsError('internal', 'Could not process the verification request.');
    }
});

export const getAllUsers = functions.https.onCall(async (data, context) => {
    if (!context.auth?.token.isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Must be an admin to access user data.');
    }

    try {
        const [usersSnapshot, statusSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('user_status').where('status', '==', 'online').get()
        ]);
        
        const onlineUsers = new Set(statusSnapshot.docs.map(doc => doc.id));
        
        const users = usersSnapshot.docs.map(doc => {
            const userData = doc.data();
            // Convert Firestore Timestamps to ISO strings
            const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : null;
            return {
                ...userData,
                createdAt,
                status: onlineUsers.has(doc.id) ? 'online' : 'offline'
            };
        });

        return { users };
    } catch (error) {
        functions.logger.error('Error fetching all users:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch users.');
    }
});
