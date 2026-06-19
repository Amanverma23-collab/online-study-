import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;

    const test = await db.test.findUnique({
      where: { id: testId },
      include: {
        sections: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const attempts = await db.attempt.findMany({
      where: { testId, submittedAt: { not: null } },
      include: {
        student: true,
        sectionResults: {
          include: {
            section: true
          }
        }
      }
    });

    const maxSec = test.duration * 60;
    let totalMarks = 0;
    test.sections.forEach(sec => {
      totalMarks += sec.questions.length * sec.marksPerQ;
    });

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
      let timeSpent = Math.floor((submitted - started) / 1000);
      if (timeSpent > maxSec) timeSpent = maxSec;

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
        score: att.totalScore || 0,
        correct,
        incorrect,
        unattempted,
        accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
        timeSpent,
        percentile: att.percentile || 0,
        subjectBreakdown
      };
    });

    results.sort((a, b) => a.rank - b.rank);

    return NextResponse.json({
      testTitle: test.title,
      totalMarks,
      results
    });
  } catch (error: any) {
    console.error("Fetch Admin Test Results Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
