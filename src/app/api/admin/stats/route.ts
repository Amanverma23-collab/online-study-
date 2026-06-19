import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const totalTests = await db.test.count();
    const liveTests = await db.test.count({
      where: { isLive: true }
    });
    const totalStudents = await db.student.count();
    const totalAttempts = await db.attempt.count();

    return NextResponse.json({
      totalTests,
      liveTests,
      totalStudents,
      totalAttempts
    });
  } catch (error: any) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
