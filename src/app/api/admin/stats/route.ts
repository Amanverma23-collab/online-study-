import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSmsBalance } from "@/lib/sms";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batch = searchParams.get("batch");

    // Build batch filter for tests (comma-separated batch field)
    const testWhere = batch ? {
      OR: [
        { batch: batch },
        { batch: { contains: `,${batch}` } },
        { batch: { contains: `${batch},` } },
      ]
    } : {};

    // Build batch filter for students (single batch field)
    const studentWhere = batch ? { batch } : {};

    // Build batch filter for attempts (via test relation)
    const attemptWhere = batch ? {
      test: {
        OR: [
          { batch: batch },
          { batch: { contains: `,${batch}` } },
          { batch: { contains: `${batch},` } },
        ]
      }
    } : {};

    const [totalTests, liveTests, totalStudents, totalAttempts] = await Promise.all([
      db.test.count({ where: testWhere }),
      db.test.count({ where: { ...testWhere, isLive: true } }),
      db.student.count({ where: studentWhere }),
      db.attempt.count({ where: attemptWhere }),
    ]);

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

