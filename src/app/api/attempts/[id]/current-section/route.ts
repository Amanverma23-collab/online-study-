import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const attemptId = params.id;

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
      return NextResponse.json({ finished: true, redirectTo: `/student/result/${attemptId}` });
    }

    const test = attempt.test;
    const sections = test.sections;

    if (sections.length === 0) {
      return NextResponse.json({ error: "Test has no sections" }, { status: 400 });
    }

    // Determine current active section
    let activeSection = sections[0];
    if (attempt.currentSectionId) {
      const found = sections.find(s => s.id === attempt.currentSectionId);
      if (found) {
        activeSection = found;
      }
    } else {
      // Fallback: find first section without a result
      const completedSectionIds = (await db.sectionResult.findMany({
        where: { attemptId: attempt.id },
        select: { sectionId: true }
      })).map(sr => sr.sectionId);

      const remainingSection = sections.find(s => !completedSectionIds.includes(s.id));
      if (remainingSection) {
        activeSection = remainingSection;
      }
    }

    // If active section started time is not set, initialize it
    let startedAt = attempt.currentSectionStartedAt;
    if (!startedAt) {
      startedAt = new Date();
      await db.attempt.update({
        where: { id: attemptId },
        data: {
          currentSectionId: activeSection.id,
          currentSectionStartedAt: startedAt
        }
      });
    }

    // Server-side check: auto-finalize expired sections and transition
    let remainingTime = 0;
    let hasCheckedExpiry = false;

    while (!hasCheckedExpiry) {
      const totalSeconds = activeSection.duration * 60;
      const elapsedSeconds = Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000);

      if (elapsedSeconds >= totalSeconds) {
        // Section has expired!
        const sectionQuestions = await db.question.findMany({
          where: { sectionId: activeSection.id }
        });
        const sectionAnswers = await db.answer.findMany({
          where: {
            attemptId,
            questionId: { in: sectionQuestions.map(q => q.id) }
          }
        });

        let score = 0;
        let correct = 0;
        let wrong = 0;
        let unattempted = 0;

        for (const q of sectionQuestions) {
          const ans = sectionAnswers.find(a => a.questionId === q.id);
          if (!ans || !ans.selected) {
            unattempted++;
          } else if (ans.selected === q.correctOption) {
            score += activeSection.marksPerQ;
            correct++;
          } else {
            score -= activeSection.negativeMarks;
            wrong++;
          }
        }
        score = Math.max(0, score);

        // Save SectionResult
        await db.sectionResult.create({
          data: {
            attemptId,
            sectionId: activeSection.id,
            score,
            correct,
            wrong,
            unattempted,
            startedAt,
            submittedAt: new Date()
          }
        });

        const isLastSection = activeSection.order === sections[sections.length - 1].order;

        if (isLastSection) {
          const allSectionResults = await db.sectionResult.findMany({
            where: { attemptId }
          });
          const totalScore = allSectionResults.reduce((sum, sr) => sum + sr.score, 0);

          await db.attempt.update({
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
          const maxTime = test.duration * 60;

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
          // Advance to next section
          const nextSection = sections.find(s => s.order === activeSection.order + 1);
          if (!nextSection) {
            return NextResponse.json({ error: "Next section not found" }, { status: 500 });
          }

          const newStartedAt = new Date();
          await db.attempt.update({
            where: { id: attemptId },
            data: {
              currentSectionId: nextSection.id,
              currentSectionStartedAt: newStartedAt
            }
          });

          activeSection = nextSection;
          startedAt = newStartedAt;
        }
      } else {
        remainingTime = totalSeconds - elapsedSeconds;
        hasCheckedExpiry = true;
      }
    }

    // Fetch questions and student answers for this section
    const questions = await db.question.findMany({
      where: { sectionId: activeSection.id },
      orderBy: { order: "asc" }
    });

    const answers = await db.answer.findMany({
      where: {
        attemptId,
        questionId: { in: questions.map(q => q.id) }
      }
    });

    // Get section result records to determine completion status
    const sectionResults = await db.sectionResult.findMany({
      where: { attemptId }
    });
    const completedSectionIds = sectionResults.map(r => r.sectionId);

    const allSections = sections.map(s => {
      const isCompleted = completedSectionIds.includes(s.id) || s.order < activeSection.order;
      return {
        id: s.id,
        subject: s.subject,
        order: s.order,
        duration: s.duration,
        isCompleted
      };
    });

    return NextResponse.json({
      finished: false,
      testTitle: test.title,
      attemptId,
      remainingTime,
      section: {
        id: activeSection.id,
        subject: activeSection.subject,
        order: activeSection.order,
        duration: activeSection.duration,
        marksPerQ: activeSection.marksPerQ,
        negativeMarks: activeSection.negativeMarks
      },
      questions: questions.map(q => ({
        id: q.id,
        order: q.order,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD
      })),
      answers: answers.map(a => ({
        questionId: a.questionId,
        selected: a.selected,
        isMarked: a.isMarked,
        isVisited: a.isVisited
      })),
      allSections
    });
  } catch (error: any) {
    console.error("GET Current Section Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
