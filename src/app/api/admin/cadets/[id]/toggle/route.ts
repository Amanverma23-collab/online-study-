import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await db.student.findUnique({
      where: { id: params.id }
    });

    if (!student) {
      return NextResponse.json({ error: "Cadet not found" }, { status: 404 });
    }

    const nextStatus = student.status === "BANNED" ? "VERIFIED" : "BANNED";

    const updatedStudent = await db.student.update({
      where: { id: params.id },
      data: { status: nextStatus }
    });

    return NextResponse.json({
      success: true,
      status: updatedStudent.status
    });
  } catch (error: any) {
    console.error("Toggle Cadet Status Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
