import { db } from "./db";
import { getApps } from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import "./firebase-admin";

export async function createNotification({
  recipientType,
  recipientId = null,
  type,
  title,
  message,
  link,
  batch = null,
}: {
  recipientType: "ADMIN" | "STUDENT";
  recipientId?: string | null;
  type: "NEW_STUDENT" | "NEW_TEST" | "NEW_LIVE_CLASS" | "NEW_RECORDED_CLASS" | "NEW_ANNOUNCEMENT" | "PURCHASE_SUCCESS";
  title: string;
  message: string;
  link?: string;
  batch?: string | null;
}) {
  // Step 1: Create in-app notification
  const notification = await db.notification.create({
    data: {
      recipientType,
      recipientId,
      type,
      title,
      message,
      link,
      batch,
    },
  });

  // Step 2: Push notifications (Layer 2)
  try {
    if (getApps().length > 0) {
      const messaging = getMessaging();

      if (recipientId) {
        // Direct notification to one specific user
        const user = recipientType === "STUDENT"
          ? await db.student.findUnique({ where: { id: recipientId }, select: { fcmToken: true } })
          : await db.admin.findUnique({ where: { id: recipientId }, select: { fcmToken: true } });

        if (user?.fcmToken) {
          await messaging.send({
            token: user.fcmToken,
            notification: { title, body: message },
            data: link ? { link } : undefined,
            webpush: { fcmOptions: { link: link || "/" } }
          });
        }
      } else {
        // Broadcast to all students (with optional batch filtering)
        let students;
        if (recipientType === "STUDENT" && batch) {
          const allowedBatches = batch.split(",").map(b => b.trim());
          students = await db.student.findMany({
            where: {
              fcmToken: { not: null },
              status: "VERIFIED",
              batch: { in: allowedBatches }
            },
            select: { fcmToken: true }
          });
        } else if (recipientType === "STUDENT") {
          students = await db.student.findMany({
            where: { fcmToken: { not: null }, status: "VERIFIED" },
            select: { fcmToken: true }
          });
        } else {
          // Broadcast to all admins
          students = await db.admin.findMany({
            where: { fcmToken: { not: null } },
            select: { fcmToken: true }
          });
        }

        const tokens = students.map(s => s.fcmToken!).filter(Boolean);

        if (tokens.length > 0) {
          // Send in batches of 500 (FCM limit per call)
          for (let i = 0; i < tokens.length; i += 500) {
            const batchTokens = tokens.slice(i, i + 500);
            await messaging.sendEachForMulticast({
              tokens: batchTokens,
              notification: { title, body: message },
              data: link ? { link } : undefined,
              webpush: { fcmOptions: { link: link || "/student/dashboard" } }
            });
          }
        }
      }
    } else {
      console.warn("FCM push notification skipped: Firebase Admin SDK is not initialized.");
    }
  } catch (pushError) {
    // Push notification failure should NOT break the in-app notification
    console.error("Push notification send error (non-critical):", pushError);
  }

  return notification;
}
