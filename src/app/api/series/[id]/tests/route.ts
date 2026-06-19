import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const seriesId = params.id;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    // 1. Check purchase/enrollment access
    const purchase = await db.seriesPurchase.findUnique({
      where: {
        studentId_seriesId: { studentId, seriesId }
      }
    });

    if (!purchase || purchase.status !== "success") {
      return NextResponse.json({ error: "Access Denied: Test series not purchased" }, { status: 403 });
    }

    // 2. Fetch all tests in series ordered by order
    const seriesTests = await db.seriesTest.findMany({
      where: { seriesId },
      include: {
        sections: {
          select: {
            subject: true,
            _count: {
              select: { questions: true }
            }
          }
        }
      },
      orderBy: { order: "asc" }
    });

    // 3. Fetch student attempts for these tests
    const studentAttempts = await db.seriesAttempt.findMany({
      where: {
        studentId,
        seriesTest: { seriesId }
      }
    });

    // 4. Calculate unlock sequence status
    let previousCompleted = true; // First test is always unlocked

    const testList = seriesTests.map((test) => {
      const attempt = studentAttempts.find((a) => a.seriesTestId === test.id);
      const isCompleted = !!(attempt && attempt.submittedAt !== null);
      const isUnlocked = previousCompleted;

      previousCompleted = isCompleted;

      const questionsCount = test.sections.reduce((sum, sec) => sum + sec._count.questions, 0);
      const subjectsList = test.sections.map(s => s.subject).join(", ");
      const { sections, ...rest } = test;

      return {
        ...rest,
        subject: subjectsList,
        _count: {
          questions: questionsCount
        },
        status: isCompleted ? "completed" : (isUnlocked ? "unlocked" : "locked"),
        score: attempt?.score ?? null,
        attemptId: attempt?.id ?? null
      };
    });

    return NextResponse.json(testList);
  } catch (error: any) {
    console.error("Fetch Series Tests Unlock Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
