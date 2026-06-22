import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminId = (session?.user as any)?.id;

    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message, batch, link } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and Message are required fields" }, { status: 400 });
    }

    const notification = await createNotification({
      recipientType: "STUDENT",
      recipientId: null, // broadcast to students
      type: "NEW_ANNOUNCEMENT",
      title,
      message,
      link: link || "/student/dashboard",
      batch: batch || null // can target specific batch, e.g. "NDA" or "NDA,CDS"
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("Create Announcement Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
