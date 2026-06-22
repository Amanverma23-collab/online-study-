import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const adminId = (session?.user as any)?.id;

    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message, batch, link } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and Message are required" }, { status: 400 });
    }

    const notification = await db.notification.update({
      where: { id: params.id },
      data: {
        title,
        message,
        batch: batch || null,
        link: link || "/student/dashboard"
      }
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("Update Announcement Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const adminId = (session?.user as any)?.id;

    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.notification.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Announcement Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
