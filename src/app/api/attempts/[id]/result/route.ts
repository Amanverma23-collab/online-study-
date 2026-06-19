import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const attemptId = params.id;

    // 1. Fetch current attempt, student, test, sections, questions, and selected answers
    const currentAttempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        test: {
          include: {
            sections: {
              orderBy: { order: "asc" },
              include: {
                questions: {
                  orderBy: { order: "asc" }
                },
                sectionResults: {
                  where: { attemptId }
                }
              }
            }
          }
        },
        answers: true,
        sectionResults: {
          include: {
            section: true
          }
        }
      }
    });

    if (!currentAttempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const test = currentAttempt.test;
    const student = currentAttempt.student;

    // Calculate total questions and total marks dynamically
    let totalQuestions = 0;
    let totalMarks = 0;
    const flatQuestions: any[] = [];

    test.sections.forEach(sec => {
      totalQuestions += sec.questions.length;
      totalMarks += sec.questions.length * sec.marksPerQ;
      sec.questions.forEach(q => {
        flatQuestions.push({
          ...q,
          subject: sec.subject
        });
      });
    });

    // 2. Fetch all submitted attempts for comparison
    const allAttempts = await db.attempt.findMany({
      where: {
        testId: test.id,
        submittedAt: { not: null }
      },
      include: {
        student: {
          select: { name: true }
        },
        sectionResults: true
      }
    });

    if (allAttempts.length === 0) {
      return NextResponse.json({ error: "No submitted attempts found for this test" }, { status: 400 });
    }

    const maxSec = test.duration * 60;

    // Helper to calculate statistics for any attempt
    const calculateAttemptStats = (att: typeof allAttempts[0]) => {
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

      return {
        id: att.id,
        studentName: att.student.name,
        score: att.totalScore || 0,
        correct,
        incorrect,
        unattempted,
        timeSpent: timeSpentSec,
        accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
        rank: att.rank || 0,
        percentile: att.percentile || 0,
        totalTakers: att.totalTakers || allAttempts.length
      };
    };

    const allStats = allAttempts.map(calculateAttemptStats);

    // Get "You" stats
    const youStats = allStats.find((s) => s.id === attemptId)!;

    // Get "Topper" (highest score, ties broken by faster timeSpent)
    const topperStats = [...allStats].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpent - b.timeSpent;
    })[0];

    // Get "Avg"
    const total = allStats.length;
    const avgScore = allStats.reduce((s, a) => s + a.score, 0) / total;
    const avgCorrect = allStats.reduce((s, a) => s + a.correct, 0) / total;
    const avgWrong = allStats.reduce((s, a) => s + a.incorrect, 0) / total;
    const avgTime = allStats.reduce((s, a) => s + a.timeSpent, 0) / total;
    const avgAccuracy = allStats.reduce((s, a) => s + a.accuracy, 0) / total;

    const avgStats = {
      score: parseFloat(avgScore.toFixed(2)),
      correct: parseFloat(avgCorrect.toFixed(2)),
      incorrect: parseFloat(avgWrong.toFixed(2)),
      timeSpent: Math.round(avgTime),
      accuracy: parseFloat(avgAccuracy.toFixed(2))
    };

    // Get Top Rankers (Top 10)
    const topRankers = allStats
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeSpent - b.timeSpent;
      })
      .slice(0, 10)
      .map((s, index) => ({
        rank: index + 1,
        name: s.studentName,
        score: s.score
      }));

    // Question-wise review detailed list
    const questionReview = flatQuestions.map((q) => {
      const studentAnswer = currentAttempt.answers.find((a) => a.questionId === q.id);
      return {
        id: q.id,
        order: q.order,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation || null,
        selectedOption: studentAnswer?.selected || null,
        isMarked: studentAnswer?.isMarked || false,
        isVisited: studentAnswer?.isVisited || false,
        subject: q.subject,
        sectionId: q.sectionId
      };
    });

    // Subject breakdown table
    const subjectBreakdown = currentAttempt.sectionResults.map(sr => {
      const secQuestionsCount = sr.section.duration; // Just dummy/info fallback or count actual
      const qInSec = flatQuestions.filter(q => q.sectionId === sr.sectionId).length;
      const totalSecScore = qInSec * sr.section.marksPerQ;

      const timeTakenSec = Math.floor((new Date(sr.submittedAt).getTime() - new Date(sr.startedAt).getTime()) / 1000);
      const minutes = Math.floor(timeTakenSec / 60);
      const seconds = timeTakenSec % 60;
      const timeTakenStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      return {
        subject: sr.section.subject,
        score: `${sr.score.toFixed(1)}/${totalSecScore.toFixed(0)}`,
        correct: sr.correct,
        wrong: sr.wrong,
        unattempted: sr.unattempted,
        accuracy: sr.correct + sr.wrong > 0 ? Math.round((sr.correct / (sr.correct + sr.wrong)) * 100) : 0,
        timeTaken: timeTakenStr,
        timeTakenSec
      };
    });

    // Add a Total row to breakdown
    let totalScoreObtained = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;
    let totalTimeSec = 0;

    currentAttempt.sectionResults.forEach(sr => {
      totalScoreObtained += sr.score;
      totalCorrect += sr.correct;
      totalWrong += sr.wrong;
      totalUnattempted += sr.unattempted;
      totalTimeSec += Math.floor((new Date(sr.submittedAt).getTime() - new Date(sr.startedAt).getTime()) / 1000);
    });

    const totMinutes = Math.floor(totalTimeSec / 60);
    const totSeconds = totalTimeSec % 60;
    const totTimeStr = `${totMinutes}:${totSeconds.toString().padStart(2, "0")}`;

    subjectBreakdown.push({
      subject: "Total",
      score: `${totalScoreObtained.toFixed(1)}/${totalMarks.toFixed(0)}`,
      correct: totalCorrect,
      wrong: totalWrong,
      unattempted: totalUnattempted,
      accuracy: totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0,
      timeTaken: totTimeStr,
      timeTakenSec: totalTimeSec
    });

    return NextResponse.json({
      testTitle: test.title,
      duration: test.duration,
      totalMarks,
      cutoffMarks: test.cutoffMarks,
      studentName: student.name,
      you: youStats,
      topper: topperStats,
      avg: avgStats,
      topRankers,
      questions: questionReview,
      subjectBreakdown
    });
  } catch (error: any) {
    console.error("Fetch Result Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
