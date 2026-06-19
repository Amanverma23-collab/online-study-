import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { studentId, seriesTestId } = await req.json();

    if (!studentId || !seriesTestId) {
      return NextResponse.json({ error: "studentId and seriesTestId are required" }, { status: 400 });
    }

    // 1. Fetch test details, sections and its series
    const test = await db.seriesTest.findUnique({
      where: { id: seriesTestId },
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
      return NextResponse.json({ error: "This series test has no sections configured yet." }, { status: 400 });
    }

    // 2. Verify purchase
    const purchase = await db.seriesPurchase.findUnique({
      where: {
        studentId_seriesId: { studentId, seriesId: test.seriesId }
      }
    });

    if (!purchase || purchase.status !== "success") {
      return NextResponse.json({ error: "Access Denied: Test series not purchased" }, { status: 403 });
    }

    // 3. Verify unlock logic: preceding tests must be completed
    const precedingTests = await db.seriesTest.findMany({
      where: {
        seriesId: test.seriesId,
        order: { lt: test.order }
      }
    });

    if (precedingTests.length > 0) {
      const completedAttemptsCount = await db.seriesAttempt.count({
        where: {
          studentId,
          seriesTestId: { in: precedingTests.map((t) => t.id) },
          submittedAt: { not: null }
        }
      });

      if (completedAttemptsCount < precedingTests.length) {
        return NextResponse.json({ error: "Access Denied: This test is locked." }, { status: 403 });
      }
    }

    // 4. Create or fetch attempt
    let attempt = await db.seriesAttempt.findUnique({
      where: {
        studentId_seriesTestId: { studentId, seriesTestId }
      }
    });

    if (attempt) {
      if (attempt.submittedAt !== null) {
        return NextResponse.json({ error: "Test already completed" }, { status: 400 });
      }

      // Ensure current section details are initialized if they aren't
      let currentSectionId = attempt.currentSectionId;
      let currentSectionStartedAt = attempt.currentSectionStartedAt;

      if (!currentSectionId) {
        const completedSectionIds = (await db.seriesSectionResult.findMany({
          where: { attemptId: attempt.id },
          select: { sectionId: true }
        })).map(sr => sr.sectionId);

        const activeSection = test.sections.find(s => !completedSectionIds.includes(s.id)) || test.sections[0];
        currentSectionId = activeSection.id;
        currentSectionStartedAt = new Date();

        attempt = await db.seriesAttempt.update({
          where: { id: attempt.id },
          data: {
            currentSectionId,
            currentSectionStartedAt
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: "Resuming ongoing attempt.",
        attempt
      });
    }

    // Start new attempt
    const firstSection = test.sections[0];
    attempt = await db.seriesAttempt.create({
      data: {
        studentId,
        seriesTestId,
        startedAt: new Date(),
        currentSectionId: firstSection.id,
        currentSectionStartedAt: new Date()
      }
    });

    // Pre-create answers for all questions of all sections
    const allQuestions = test.sections.flatMap(s => s.questions);
    await Promise.all(
      allQuestions.map((q) =>
        db.seriesAnswer.create({
          data: {
            attemptId: attempt!.id,
            questionId: q.id,
            selected: null,
            isMarked: false,
            isVisited: false
          }
        })
      )
    );

    return NextResponse.json({ success: true, attempt });
  } catch (error: any) {
    console.error("Start Series Attempt Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
