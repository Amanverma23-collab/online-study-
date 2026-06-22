import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isContentVisibleToStudent } from "@/lib/batch";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminId = (session?.user as any)?.id;

    if (adminId) {
      // Mark all read for Admin
      const unreadNotifications = await db.notification.findMany({
        where: {
          recipientType: "ADMIN",
          OR: [
            { recipientId: null },
            { recipientId: adminId }
          ],
          reads: {
            none: { adminId }
          }
        }
      });

      const readData = unreadNotifications.map(n => ({
        notificationId: n.id,
        adminId
      }));

      if (readData.length > 0) {
        await db.notificationRead.createMany({
          data: readData
        });
      }

      return NextResponse.json({ success: true, count: readData.length });
    }

    // Student Flow
    const body = await req.json().catch(() => ({}));
    const studentId = body?.studentId;

    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized or missing studentId" }, { status: 401 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.status === "BANNED") {
      return NextResponse.json({ error: "Invalid student or account banned" }, { status: 403 });
    }

    const unreadNotifications = await db.notification.findMany({
      where: {
        recipientType: "STUDENT",
        OR: [
          { recipientId: null },
          { recipientId: studentId }
        ],
        reads: {
          none: { studentId }
        }
      }
    });

    // Filter by student batch visibility
    const visibleUnread = unreadNotifications.filter(n => 
      !n.batch || isContentVisibleToStudent(n.batch, student.batch)
    );

    const readData = visibleUnread.map(n => ({
      notificationId: n.id,
      studentId
    }));

    if (readData.length > 0) {
      await db.notificationRead.createMany({
        data: readData
      });
    }

    return NextResponse.json({ success: true, count: readData.length });
  } catch (error: any) {
    console.error("Mark All Read Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
