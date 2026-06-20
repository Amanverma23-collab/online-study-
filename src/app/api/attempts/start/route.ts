import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isContentVisibleToStudent } from "@/lib/batch";

export async function POST(req: Request) {
  try {
    const { studentId, testId } = await req.json();

    if (!studentId || !testId) {
      return NextResponse.json({ error: "Student ID and Test ID are required" }, { status: 400 });
    }

    const test = await db.test.findUnique({
      where: { id: testId },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { questions: true }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (test.sections.length === 0) {
      return NextResponse.json({ error: "This test has no sections configured yet." }, { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status === "BANNED") {
      return NextResponse.json({ error: "Access Denied. This candidate account has been banned." }, { status: 403 });
    }

    if (!isContentVisibleToStudent(test.batch, student.batch)) {
      return NextResponse.json({ error: "Access Denied. This mock test is not available for your batch." }, { status: 403 });
    }

    const existingAttempt = await db.attempt.findUnique({
      where: {
        studentId_testId: { studentId, testId }
      }
    });

    if (existingAttempt) {
      if (existingAttempt.submittedAt !== null) {
        return NextResponse.json({ error: "You have already submitted this test. Retakes are not allowed." }, { status: 400 });
      }

      // Ensure current section details are initialized if they aren't for some reason
      let currentSectionId = existingAttempt.currentSectionId;
      let currentSectionStartedAt = existingAttempt.currentSectionStartedAt;

      if (!currentSectionId) {
        // Find first section without a result
        const completedSectionIds = (await db.sectionResult.findMany({
          where: { attemptId: existingAttempt.id },
          select: { sectionId: true }
        })).map(sr => sr.sectionId);

        const activeSection = test.sections.find(s => !completedSectionIds.includes(s.id)) || test.sections[0];
        currentSectionId = activeSection.id;
        currentSectionStartedAt = new Date();

        await db.attempt.update({
          where: { id: existingAttempt.id },
          data: {
            currentSectionId,
            currentSectionStartedAt
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: "Resuming ongoing attempt.",
        attempt: {
          ...existingAttempt,
          currentSectionId,
          currentSectionStartedAt
        }
      });
    }

    // Start new attempt
    const firstSection = test.sections[0];
    const newAttempt = await db.attempt.create({
      data: {
        studentId,
        testId,
        startedAt: new Date(),
        currentSectionId: firstSection.id,
        currentSectionStartedAt: new Date()
      }
    });

    // Pre-create answers for all questions of all sections
    const allQuestions = test.sections.flatMap(s => s.questions);
    await Promise.all(
      allQuestions.map((q) =>
        db.answer.create({
          data: {
            attemptId: newAttempt.id,
            questionId: q.id,
            selected: null,
            isMarked: false,
            isVisited: false
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "Attempt started.",
      attempt: newAttempt
    });
  } catch (error: any) {
    console.error("Start Attempt Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
