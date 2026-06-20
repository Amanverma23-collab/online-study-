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

    const allRecorded = await db.recordedClass.findMany();
    
    const visibleRecorded = allRecorded.filter((c) =>
      isContentVisibleToStudent(c.batch, student.batch)
    );

    const subjectCounts: Record<string, number> = {};
    visibleRecorded.forEach((c) => {
      subjectCounts[c.subject] = (subjectCounts[c.subject] || 0) + 1;
    });

    const result = Object.entries(subjectCounts).map(([subject, count]) => ({
      subject,
      count,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Get Recorded Subjects Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
