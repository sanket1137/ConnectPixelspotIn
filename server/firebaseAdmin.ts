import admin from "firebase-admin";

// Initialize Firebase Admin SDK
// For development, we use applicationDefault() which works in Replit environment
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

export const auth = admin.auth();

export async function verifyToken(token: string) {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return null;
  }
}
