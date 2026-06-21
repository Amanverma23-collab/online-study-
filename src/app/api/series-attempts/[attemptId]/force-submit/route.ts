import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = params.attemptId;
    const { sectionId, answers: studentAnswers } = await req.json();

    if (!sectionId) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    if (!studentAnswers || !Array.isArray(studentAnswers)) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    // 1. Fetch current attempt, student, sections, questions, and test
    const attempt = await db.seriesAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        seriesTest: {
          include: {
            sections: {
              include: {
                _count: {
                  select: { questions: true }
                }
              },
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.student.status === "BANNED") {
      return NextResponse.json({ error: "Access Denied. This candidate account has been banned." }, { status: 403 });
    }

    if (attempt.submittedAt !== null) {
      return NextResponse.json({ error: "Attempt has already been finalized" }, { status: 400 });
    }

    const test = attempt.seriesTest;
    const currentSection = test.sections.find(s => s.id === sectionId);

    if (!currentSection) {
      return NextResponse.json({ error: "Section not found in this test" }, { status: 404 });
    }

    // 2. Save student answers in DB
    await Promise.all(
      studentAnswers.map(async (ans: any) => {
        const existingAnswer = await db.seriesAnswer.findFirst({
          where: {
            attemptId,
            questionId: ans.questionId
          }
        });

        if (existingAnswer) {
          await db.seriesAnswer.update({
            where: { id: existingAnswer.id },
            data: {
              selected: ans.selected,
              isMarked: ans.isMarked || false,
              isVisited: ans.isVisited || false
            }
          });
        } else {
          await db.seriesAnswer.create({
            data: {
              attemptId,
              questionId: ans.questionId,
              selected: ans.selected,
              isMarked: ans.isMarked || false,
              isVisited: ans.isVisited || false
            }
          });
        }
      })
    );

    // 3. Score calculation for this section
    const questions = await db.seriesQuestion.findMany({
      where: { sectionId }
    });

    const answersFromDb = await db.seriesAnswer.findMany({
      where: {
        attemptId,
        questionId: { in: questions.map(q => q.id) }
      }
    });

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    for (const q of questions) {
      const ans = answersFromDb.find(a => a.questionId === q.id);
      if (!ans || !ans.selected) {
        unattempted++;
      } else if (ans.selected === q.correctOption) {
        score += currentSection.marksPerQ;
        correct++;
      } else {
        score -= currentSection.negativeMarks;
        wrong++;
      }
    }
    score = Math.max(0, score);

    const startedAt = attempt.currentSectionStartedAt || attempt.startedAt;
    const submittedAt = new Date();

    // Create or update current SectionResult
    const existingSR = await db.seriesSectionResult.findFirst({
      where: { attemptId, sectionId }
    });

    if (existingSR) {
      await db.seriesSectionResult.update({
        where: { id: existingSR.id },
        data: {
          score,
          correct,
          wrong,
          unattempted,
          submittedAt
        }
      });
    } else {
      await db.seriesSectionResult.create({
        data: {
          attemptId,
          sectionId,
          score,
          correct,
          wrong,
          unattempted,
          startedAt,
          submittedAt
        }
      });
    }

    // 4. Create dummy unattempted SectionResults for remaining sections
    const completedSectionResults = await db.seriesSectionResult.findMany({
      where: { attemptId }
    });
    const completedSectionIds = completedSectionResults.map(sr => sr.sectionId);

    const remainingSections = test.sections.filter(s => !completedSectionIds.includes(s.id));

    for (const sec of remainingSections) {
      await db.seriesSectionResult.create({
        data: {
          attemptId,
          sectionId: sec.id,
          score: 0,
          correct: 0,
          wrong: 0,
          unattempted: sec._count.questions,
          startedAt: new Date(),
          submittedAt: new Date()
        }
      });
    }

    // 5. Finalize the whole attempt
    const allSectionResults = await db.seriesSectionResult.findMany({
      where: { attemptId }
    });

    const totalScore = allSectionResults.reduce((sum, sr) => sum + sr.score, 0);

    await db.seriesAttempt.update({
      where: { id: attemptId },
      data: {
        submittedAt: new Date(),
        score: totalScore,
        currentSectionId: null,
        currentSectionStartedAt: null
      }
    });

    // 6. Recalculate ranks and percentiles for this series test
    const allSubmittedAttempts = await db.seriesAttempt.findMany({
      where: {
        seriesTestId: test.id,
        submittedAt: { not: null }
      }
    });

    const totalTakers = allSubmittedAttempts.length;
    const maxTime = test.duration * 60;

    const attemptsWithTime = allSubmittedAttempts.map((att) => {
      const attSubmittedAt = new Date(att.submittedAt!);
      const attStartedAt = new Date(att.startedAt);
      let attTime = Math.floor((attSubmittedAt.getTime() - attStartedAt.getTime()) / 1000);
      if (attTime > maxTime) attTime = maxTime;
      return {
        id: att.id,
        score: att.score || 0,
        timeSpent: attTime
      };
    });

    await Promise.all(
      attemptsWithTime.map(async (att) => {
        const rank = attemptsWithTime.filter(
          other =>
            other.score > att.score ||
            (other.score === att.score && other.timeSpent < att.timeSpent)
        ).length + 1;

        const percentile = totalTakers > 1 ? ((totalTakers - rank) / totalTakers) * 100 : 100;

        await db.seriesAttempt.update({
          where: { id: att.id },
          data: {
            rank,
            totalTakers,
            percentile: parseFloat(percentile.toFixed(2))
          }
        });
      })
    );

    return NextResponse.json({
      finished: true,
      redirectTo: `/student/series/${test.seriesId}/result/${attemptId}`
    });
  } catch (error: any) {
    console.error("Force Submit Series Attempt Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
