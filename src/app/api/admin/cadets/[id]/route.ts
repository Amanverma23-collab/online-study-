import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await db.student.findUnique({
      where: { id: params.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Cadet not found" }, { status: 404 });
    }

    await db.student.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Cadet deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Cadet Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
