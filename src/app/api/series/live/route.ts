import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isContentVisibleToStudent } from "@/lib/batch";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json([]);
    }

    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.status === "BANNED") {
      return NextResponse.json([]);
    }

    const seriesList = await db.testSeries.findMany({
      where: { isLive: true },
      include: {
        tests: {
          select: { id: true, title: true, order: true }
        },
        _count: { select: { purchases: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const visibleSeries = seriesList.filter((s) =>
      isContentVisibleToStudent(s.batch, student.batch)
    );

    const formatted = visibleSeries.map((s) => ({
      ...s,
      batch: s.batch ? s.batch.split(",") : [],
      subjects: s.subjects ? s.subjects.split(",") : []
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch Live Series Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
