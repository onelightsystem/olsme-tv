// Path: functions/src/index.ts
// Improvements (Oct 2, 2025):
// - Added `setPolitenessClaim` Cloud Function to set custom claims based on politeness and verification.
// - This function is callable from the client after a score update.
// - It calculates the politeness level (Bronze, Silver, Gold) and sets it as a custom claim.
// - It also reads the user's verificationLevel and sets it as a claim.

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
        throw new functions.httpsHttpsError(
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

    try {
        await admin.auth().setCustomUserClaims(uid, { 
            ...context.auth.token, // Preserve existing claims
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
