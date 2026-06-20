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

    const liveClasses = await db.liveClass.findMany({
      orderBy: { classDate: "asc" },
    });

    const visibleLiveClasses = liveClasses.filter((c) =>
      isContentVisibleToStudent(c.batch, student.batch)
    );

    return NextResponse.json(visibleLiveClasses);
  } catch (error: any) {
    console.error("Get Student Live Classes Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
