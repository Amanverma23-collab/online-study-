import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSmsBalance } from "@/lib/sms";

export async function GET() {
  try {
    const totalTests = await db.test.count();
    const liveTests = await db.test.count({
      where: { isLive: true }
    });
    const totalStudents = await db.student.count();
    const totalAttempts = await db.attempt.count();

    const smsInfo = await getSmsBalance();

    return NextResponse.json({
      totalTests,
      liveTests,
      totalStudents,
      totalAttempts,
      smsBalance: smsInfo?.balance ?? 0,
      smsEnabled: smsInfo?.enabled ?? false
    });
  } catch (error: any) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";

