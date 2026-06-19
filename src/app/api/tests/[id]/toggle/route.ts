import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const test = await db.test.findUnique({
      where: { id: params.id }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const updatedTest = await db.test.update({
      where: { id: params.id },
      data: { isLive: !test.isLive }
    });

    return NextResponse.json({
      success: true,
      isLive: updatedTest.isLive
    });
  } catch (error: any) {
    console.error("Toggle Test Live Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
