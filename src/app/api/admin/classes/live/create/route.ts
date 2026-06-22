import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let adminId = (session?.user as any)?.id;

    if (adminId) {
      const adminExists = await db.admin.findUnique({ where: { id: adminId } });
      if (!adminExists) adminId = null;
    }

    if (!adminId) {
      const admin = await db.admin.findFirst();
      if (!admin) {
        return NextResponse.json({ error: "No admin found." }, { status: 400 });
      }
      adminId = admin.id;
    }

    const { subject, title, details, zoomLink, classDate, batch } = await req.json();

    if (!subject || !title || !details || !zoomLink || !classDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const liveClass = await db.liveClass.create({
      data: {
        subject,
        title,
        details,
        zoomLink,
        classDate: new Date(classDate),
        batch: batch || "NDA",
        adminId,
      },
    });

    // Notify students of the live class
    try {
      const formattedDate = new Date(liveClass.classDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
      await createNotification({
        recipientType: "STUDENT",
        recipientId: null,
        type: "NEW_LIVE_CLASS",
        title: `Live class scheduled: ${liveClass.title}`,
        message: `${liveClass.subject} — ${formattedDate}`,
        link: "/student/classes",
        batch: liveClass.batch
      });
    } catch (notifyError) {
      console.error("Non-critical: Failed to send live class creation notification:", notifyError);
    }

    return NextResponse.json(liveClass);
  } catch (error: any) {
    console.error("Create Live Class Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
