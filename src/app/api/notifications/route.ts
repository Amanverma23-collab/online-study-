import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isContentVisibleToStudent } from "@/lib/batch";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const adminId = (session?.user as any)?.id;

    if (adminId) {
      // User is Admin
      const allNotifications = await db.notification.findMany({
        where: {
          recipientType: "ADMIN",
          OR: [
            { recipientId: null },
            { recipientId: adminId }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          reads: {
            where: { adminId }
          }
        }
      });

      const formatted = allNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        createdAt: n.createdAt,
        isRead: n.reads.length > 0
      })).slice(0, 20);

      const unreadCount = formatted.filter(n => !n.isRead).length;

      return NextResponse.json({
        notifications: formatted,
        unreadCount
      });
    }

    // User is Student
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.status === "BANNED") {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const allNotifications = await db.notification.findMany({
      where: {
        recipientType: "STUDENT",
        OR: [
          { recipientId: null },
          { recipientId: studentId }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reads: {
          where: { studentId }
        }
      }
    });

    // Filter by student batch visibility
    const visible = allNotifications.filter(n => 
      !n.batch || isContentVisibleToStudent(n.batch, student.batch)
    );

    const formatted = visible.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      createdAt: n.createdAt,
      isRead: n.reads.length > 0
    })).slice(0, 20);

    const unreadCount = formatted.filter(n => !n.isRead).length;

    return NextResponse.json({
      notifications: formatted,
      unreadCount
    });

  } catch (error: any) {
    console.error("GET Notifications Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
