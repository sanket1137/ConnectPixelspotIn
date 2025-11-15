import admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Clean up the private key - remove quotes and fix formatting
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      // Remove surrounding quotes if present
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      // Replace escaped newlines with actual newlines (\\n -> \n)
      privateKey = privateKey.replace(/\\n/g, '\n');
      // Trim any whitespace
      privateKey = privateKey.trim();
    }
    
    if (privateKey && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      // Use service account credentials
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase Admin initialized with service account credentials");
    } else {
      // Fallback to default credentials (for environments like Replit)
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      console.log("⚠️ Firebase Admin initialized with default credentials");
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
    console.log("🔄 Attempting fallback initialization without credentials...");
    
    // Fallback initialization without credentials - will use client-side Firebase only
    try {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      console.log("✅ Firebase Admin initialized in fallback mode");
    } catch (fallbackError) {
      console.error("❌ Firebase Admin fallback initialization also failed:", fallbackError);
      console.log("⚠️ Application will run without Firebase Admin SDK - relying on client-side authentication only");
    }
  }
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
