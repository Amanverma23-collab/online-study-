import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    if (!notificationId) {
      return NextResponse.json({ error: "Missing notification ID" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const adminId = (session?.user as any)?.id;

    if (adminId) {
      // Mark as read for Admin
      const existing = await db.notificationRead.findFirst({
        where: { notificationId, adminId }
      });

      if (!existing) {
        await db.notificationRead.create({
          data: { notificationId, adminId }
        });
      }
      return NextResponse.json({ success: true });
    }

    // Try to get studentId from body
    const body = await req.json().catch(() => ({}));
    const studentId = body?.studentId;

    if (!studentId) {
      return NextResponse.json({ error: "Unauthorized or missing studentId" }, { status: 401 });
    }

    // Mark as read for Student
    const existing = await db.notificationRead.findFirst({
      where: { notificationId, studentId }
    });

    if (!existing) {
      await db.notificationRead.create({
        data: { notificationId, studentId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mark Read Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
