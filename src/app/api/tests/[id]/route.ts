import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const test = await db.test.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error: any) {
    console.error("Get Test Details Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;

    // Check if test exists
    const test = await db.test.findUnique({
      where: { id: testId }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Rely on onDelete: Cascade defined in schema.prisma
    await db.test.delete({
      where: { id: testId }
    });

    return NextResponse.json({ success: true, message: "Test deleted successfully" });
  } catch (error: any) {
    console.error("Delete Test Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
