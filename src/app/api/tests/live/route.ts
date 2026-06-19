import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
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

    const formattedTests = liveTests.map(t => {
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
