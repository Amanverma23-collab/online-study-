import { getApps, initializeApp, cert } from "firebase-admin";

const serviceAccountStr = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

if (getApps().length === 0) {
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin SDK:", error);
    }
  } else {
    console.warn("FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not defined. FCM push notifications will be skipped.");
  }
}
