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

    const liveTests = await db.test.findMany({
      where: { isLive: true },
      include: {
        sections: {
          select: {
            subject: true,
            marksPerQ: true,
            _count: {
              select: { questions: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const visibleTests = liveTests.filter((test) =>
      isContentVisibleToStudent(test.batch, student.batch)
    );

    const formattedTests = visibleTests.map(t => {
      const questionsCount = t.sections.reduce((sum, sec) => sum + sec._count.questions, 0);
      const totalMarks = t.sections.reduce((sum, sec) => sum + (sec.marksPerQ * sec._count.questions), 0);
      const subjectsList = t.sections.map(s => s.subject).join(", ");
      const { sections, ...rest } = t;
      return {
        ...rest,
        subject: subjectsList,
        totalMarks,
        _count: {
          questions: questionsCount
        }
      };
    });

    return NextResponse.json(formattedTests);
  } catch (error: any) {
    console.error("Fetch Live Tests Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
