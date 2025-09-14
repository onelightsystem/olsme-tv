import * as functions from "firebase-functions";
       import * as admin from "firebase-admin";
       import cors from "cors";

       admin.initializeApp();

       const corsHandler = cors({
         origin: [
           "http://localhost:9002",
           "https://studio-4615914296-4bd91.web.app",
           "https://olsme.tv",
           /^https:\/\/[a-z0-9-]+\.olsme\.tv$/
         ]
       });

       export const matchUsers = functions.https.onRequest(async (req, res) => {
         return corsHandler(req, res, async () => {
           try {
             const users = await admin.firestore()
               .collection("users")
               .where("politenessScore", ">", 0.8)
               .get();
             return res.status(200).json({ matchedUsers: users.docs.map((doc) => doc.id) });
           } catch (error) {
             functions.logger.error("Error matching users", { error });
             return res.status(500).json({ error: "Internal server error" });
           }
         });
       });