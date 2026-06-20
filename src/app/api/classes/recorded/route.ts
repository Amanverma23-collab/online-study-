import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isContentVisibleToStudent } from "@/lib/batch";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const studentId = searchParams.get("studentId");

    if (!subject) {
      return NextResponse.json(
        { error: "Subject query parameter is required" },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json([]);
    }

    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.status === "BANNED") {
      return NextResponse.json([]);
    }

    const recordedClasses = await db.recordedClass.findMany({
      where: { subject },
      orderBy: { createdAt: "desc" },
    });

    const visibleRecordedClasses = recordedClasses.filter((c) =>
      isContentVisibleToStudent(c.batch, student.batch)
    );

    return NextResponse.json(visibleRecordedClasses);
  } catch (error: any) {
    console.error("Get Student Recorded Classes Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
