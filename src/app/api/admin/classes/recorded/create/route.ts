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

    const { subject, className, details, youtubeLink, notesUrl, notesName, batch } =
      await req.json();

    if (!subject || !className || !details || !youtubeLink) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const recordedClass = await db.recordedClass.create({
      data: {
        subject,
        className,
        details,
        youtubeLink,
        notesUrl: notesUrl || null,
        notesName: notesName || null,
        batch: batch || "NDA",
        adminId,
      },
    });

    // Notify students of the recorded class
    try {
      await createNotification({
        recipientType: "STUDENT",
        recipientId: null,
        type: "NEW_RECORDED_CLASS",
        title: `New recording uploaded: ${recordedClass.className}`,
        message: `${recordedClass.subject} class recording is now available.`,
        link: "/student/classes",
        batch: recordedClass.batch
      });
    } catch (notifyError) {
      console.error("Non-critical: Failed to send recorded class creation notification:", notifyError);
    }

    return NextResponse.json(recordedClass);
  } catch (error: any) {
    console.error("Create Recorded Class Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
