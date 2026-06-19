import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const attemptId = params.id;
    const { sectionId, answers: studentAnswers } = await req.json();

    if (!sectionId) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    if (!studentAnswers || !Array.isArray(studentAnswers)) {
      return NextResponse.json({ error: "Answers array is required" }, { status: 400 });
    }

    // 1. Fetch current attempt, student, section, questions, and test
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        test: {
          include: {
            sections: {
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

    const test = attempt.test;
    const currentSection = test.sections.find(s => s.id === sectionId);

    if (!currentSection) {
      return NextResponse.json({ error: "Section not found in this test" }, { status: 404 });
    }

    // Check if section result already exists (prevent duplicate submission)
    const existingSectionResult = await db.sectionResult.findFirst({
      where: { attemptId, sectionId }
    });

    if (existingSectionResult) {
      return NextResponse.json({ error: "Section already submitted" }, { status: 400 });
    }

    const questions = await db.question.findMany({
      where: { sectionId }
    });

    // 2. Save student answers in DB
    await Promise.all(
      studentAnswers.map(async (ans: any) => {
        const existingAnswer = await db.answer.findFirst({
          where: {
            attemptId,
            questionId: ans.questionId
          }
        });

        if (existingAnswer) {
          await db.answer.update({
            where: { id: existingAnswer.id },
            data: {
              selected: ans.selected,
              isMarked: ans.isMarked || false,
              isVisited: ans.isVisited || false
            }
          });
        } else {
          await db.answer.create({
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
    const answersFromDb = await db.answer.findMany({
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

    // Create SectionResult
    await db.sectionResult.create({
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

    // 4. Check if this is the last section in the test
    const isLastSection = currentSection.order === test.sections[test.sections.length - 1].order;

    if (isLastSection) {
      // Finalize the whole attempt
      const allSectionResults = await db.sectionResult.findMany({
        where: { attemptId }
      });

      const totalScore = allSectionResults.reduce((sum, sr) => sum + sr.score, 0);

      const finalAttempt = await db.attempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: new Date(),
          totalScore,
          currentSectionId: null,
          currentSectionStartedAt: null
        }
      });

      // Recalculate ranks and percentiles for this test
      const allSubmittedAttempts = await db.attempt.findMany({
        where: {
          testId: test.id,
          submittedAt: { not: null }
        }
      });

      const totalTakers = allSubmittedAttempts.length;
      const maxTime = test.duration * 60; // total duration of the test in seconds

      const attemptsWithTime = allSubmittedAttempts.map((att) => {
        const attSubmittedAt = new Date(att.submittedAt!);
        const attStartedAt = new Date(att.startedAt);
        let attTime = Math.floor((attSubmittedAt.getTime() - attStartedAt.getTime()) / 1000);
        if (attTime > maxTime) attTime = maxTime;
        return {
          id: att.id,
          score: att.totalScore || 0,
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

          const percentile = totalTakers <= 1 ? 100 : ((totalTakers - rank) / totalTakers) * 100;

          await db.attempt.update({
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
        redirectTo: `/student/result/${attemptId}`
      });
    } else {
      // Advance to the next section
      const nextSection = test.sections.find(s => s.order === currentSection.order + 1);
      if (!nextSection) {
        return NextResponse.json({ error: "Next section not found" }, { status: 500 });
      }

      await db.attempt.update({
        where: { id: attemptId },
        data: {
          currentSectionId: nextSection.id,
          currentSectionStartedAt: new Date()
        }
      });

      return NextResponse.json({
        finished: false,
        nextSectionId: nextSection.id
      });
    }
  } catch (error: any) {
    console.error("Submit Section Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
