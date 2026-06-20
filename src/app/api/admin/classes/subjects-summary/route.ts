import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get("batch");

    const whereClause = batch
      ? {
          batch: {
            contains: batch,
          },
        }
      : {};

    const [liveClasses, recordedClasses] = await Promise.all([
      db.liveClass.groupBy({
        by: ["subject"],
        where: whereClause,
        _count: { id: true },
      }),
      db.recordedClass.groupBy({
        by: ["subject"],
        where: whereClause,
        _count: { id: true },
      }),
    ]);

    const liveMap: Record<string, number> = {};
    liveClasses.forEach((g) => {
      liveMap[g.subject] = g._count.id;
    });

    const recordedMap: Record<string, number> = {};
    recordedClasses.forEach((g) => {
      recordedMap[g.subject] = g._count.id;
    });

    // Merge all subjects that appear in either live or recorded
    const allSubjects = new Set([
      ...Object.keys(liveMap),
      ...Object.keys(recordedMap),
    ]);

    const summary = Array.from(allSubjects).map((subject) => ({
      subject,
      liveCount: liveMap[subject] || 0,
      recordedCount: recordedMap[subject] || 0,
    }));

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Subjects Summary Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
