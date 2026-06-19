import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { seriesId: string; seriesTestId: string } }
) {
  try {
    const { seriesTestId } = params;

    const test = await db.seriesTest.findUnique({
      where: { id: seriesTestId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: true
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Series test not found" }, { status: 404 });
    }

    const attempts = await db.seriesAttempt.findMany({
      where: {
        seriesTestId,
        submittedAt: { not: null }
      },
      include: {
        student: {
          select: { name: true, fatherName: true, mobile: true }
        },
        sectionResults: {
          include: {
            section: true
          }
        }
      },
      orderBy: [
        { rank: "asc" }
      ]
    });

    const maxSec = test.duration * 60;

    const results = attempts.map((att) => {
      let correct = 0;
      let incorrect = 0;
      let unattempted = 0;

      att.sectionResults.forEach(sr => {
        correct += sr.correct;
        incorrect += sr.wrong;
        unattempted += sr.unattempted;
      });

      const started = new Date(att.startedAt).getTime();
      const submitted = new Date(att.submittedAt!).getTime();
      let timeSpentSec = Math.floor((submitted - started) / 1000);
      if (timeSpentSec > maxSec) timeSpentSec = maxSec;

      const subjectBreakdown = att.sectionResults.map(sr => {
        const qInSec = test.sections.find(s => s.id === sr.sectionId)?.questions.length || 0;
        const maxSecMarks = qInSec * sr.section.marksPerQ;
        return {
          subject: sr.section.subject,
          score: sr.score,
          maxMarks: maxSecMarks,
          correct: sr.correct,
          wrong: sr.wrong,
          unattempted: sr.unattempted
        };
      });

      return {
        id: att.id,
        rank: att.rank || 0,
        studentName: att.student.name,
        fatherName: att.student.fatherName,
        mobile: att.student.mobile,
        score: att.score || 0,
        correct,
        wrong: incorrect,
        unattempted,
        timeTaken: timeSpentSec,
        subjectBreakdown
      };
    });

    // Make sure ranks are sorted properly
    results.sort((a, b) => a.rank - b.rank);

    return NextResponse.json({
      success: true,
      testTitle: test.title,
      results
    });
  } catch (error: any) {
    console.error("Fetch Series Test Results Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
