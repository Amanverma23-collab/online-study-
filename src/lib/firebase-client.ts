import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export async function requestNotificationPermission(userId: string, userType: "student" | "admin") {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return null;
    }

    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM is not supported in this browser context.");
      return null;
    }

    const messaging = getMessaging(app);

    // Ask user for permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      // Save token to backend
      await fetch("/api/notifications/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId, userType }),
      });
    }

    return token;
  } catch (error) {
    console.error("FCM token error:", error);
    return null;
  }
}
