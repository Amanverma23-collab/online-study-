import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { token, userId, userType } = await req.json();

    if (!token || !userId || !userType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (userType === "student") {
      await db.student.update({
        where: { id: userId },
        data: { fcmToken: token }
      });
    } else {
      await db.admin.update({
        where: { id: userId },
        data: { fcmToken: token }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("FCM Token Save Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
