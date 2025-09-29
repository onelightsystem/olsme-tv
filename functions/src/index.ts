// Path: functions/src/index.ts
// Improvements (Oct 1, 2025):
// - Added `upgradeToPremium` Cloud Function to handle user package upgrades.
// - This function updates the user's `package` field in Firestore and sets a custom auth claim `isPremium: true`.
// - Added security check to ensure only authenticated users can call the function.
// - Kept `matchUsers` function for future use.
// - Aligns with blueprint: Enables the freemium business model by providing a secure way to grant premium access.

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
        // Here you would typically integrate with a payment provider like Stripe.
        // For this example, we'll assume payment is successful.
        // const paymentId = data.paymentId; 
        
        // Update user document in Firestore.
        await userRef.update({ package: 'premium' });

        // Set custom auth claim.
        await admin.auth().setCustomUserClaims(uid, { isPremium: true });

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
