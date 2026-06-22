/**
 * ONE-TIME DATA FIX SCRIPT
 * 
 * Recalculates all SectionResult (score/correct/wrong/unattempted) from raw answers,
 * then recalculates Attempt totalScore, rank, and percentile for ALL submitted attempts.
 * 
 * Run: npx tsx scripts/fix-scoring-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixRegularTests() {
  console.log("\n=== FIXING REGULAR TEST ATTEMPTS ===\n");

  const submittedAttempts = await prisma.attempt.findMany({
    where: { submittedAt: { not: null } },
    include: {
      test: {
        include: {
          sections: {
            include: {
              questions: true,
              _count: { select: { questions: true } }
            },
            orderBy: { order: "asc" }
          }
        }
      },
      sectionResults: true,
      answers: true
    }
  });

  console.log(`Found ${submittedAttempts.length} submitted regular test attempts`);

  let fixedSections = 0;
  let fixedAttempts = 0;

  for (const attempt of submittedAttempts) {
    const test = attempt.test;
    let attemptTotalScore = 0;
    let attemptUpdated = false;

    for (const section of test.sections) {
      const existingSR = attempt.sectionResults.find(sr => sr.sectionId === section.id);

      // Get answers for this section's questions
      const sectionQuestionIds = section.questions.map(q => q.id);
      const sectionAnswers = attempt.answers.filter(a => sectionQuestionIds.includes(a.questionId));

      // Recalculate using case-insensitive comparison
      let score = 0;
      let correct = 0;
      let wrong = 0;
      let unattempted = 0;

      for (const q of section.questions) {
        const ans = sectionAnswers.find(a => a.questionId === q.id);
        if (!ans || !ans.selected) {
          unattempted++;
        } else if (ans.selected.trim().toUpperCase() === q.correctOption.trim().toUpperCase()) {
          score += section.marksPerQ;
          correct++;
        } else {
          score -= section.negativeMarks;
          wrong++;
        }
      }
      score = Math.max(0, score);

      if (existingSR) {
        // Check if values actually changed
        const needsUpdate =
          Math.abs(existingSR.score - score) > 0.001 ||
          existingSR.correct !== correct ||
          existingSR.wrong !== wrong ||
          existingSR.unattempted !== unattempted;

        if (needsUpdate) {
          await prisma.sectionResult.update({
            where: { id: existingSR.id },
            data: { score, correct, wrong, unattempted }
          });
          console.log(`  Updated SectionResult ${existingSR.id}: score ${existingSR.score}→${score}, correct ${existingSR.correct}→${correct}, wrong ${existingSR.wrong}→${wrong}`);
          fixedSections++;
          attemptUpdated = true;
        }
      } else {
        // SectionResult missing — create it
        await prisma.sectionResult.create({
          data: {
            attemptId: attempt.id,
            sectionId: section.id,
            score,
            correct,
            wrong,
            unattempted,
            startedAt: attempt.currentSectionStartedAt || attempt.startedAt,
            submittedAt: attempt.submittedAt
          }
        });
        console.log(`  Created missing SectionResult for section ${section.subject}: score=${score}, correct=${correct}, wrong=${wrong}`);
        fixedSections++;
        attemptUpdated = true;
      }

      attemptTotalScore += score;
    }

    // Update totalScore on Attempt if needed
    if (attemptUpdated || Math.abs((attempt.totalScore || 0) - attemptTotalScore) > 0.001) {
      await prisma.attempt.update({
        where: { id: attempt.id },
        data: { totalScore: attemptTotalScore }
      });
      console.log(`  Updated Attempt ${attempt.id}: totalScore ${(attempt.totalScore || 0)}→${attemptTotalScore}`);
      fixedAttempts++;
    }
  }

  // Recalculate ranks and percentiles per test
  console.log("\n--- Recalculating ranks & percentiles for regular tests ---");

  const testIds = [...new Set(submittedAttempts.map(a => a.testId))];

  for (const testId of testIds) {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { sections: { include: { _count: { select: { questions: true } } } } }
    });
    if (!test) continue;

    const maxTime = test.duration * 60;
    const attempts = await prisma.attempt.findMany({
      where: { testId, submittedAt: { not: null } }
    });

    const totalTakers = attempts.length;
    const attemptsWithTime = attempts.map(att => {
      const time = Math.floor((new Date(att.submittedAt!).getTime() - new Date(att.startedAt).getTime()) / 1000);
      return { id: att.id, score: att.totalScore || 0, timeSpent: Math.min(time, maxTime) };
    });

    await Promise.all(
      attemptsWithTime.map(async (att) => {
        const rank = attemptsWithTime.filter(
          other => other.score > att.score || (other.score === att.score && other.timeSpent < att.timeSpent)
        ).length + 1;

        const percentile = totalTakers > 1 ? ((totalTakers - rank) / totalTakers) * 100 : 100;

        await prisma.attempt.update({
          where: { id: att.id },
          data: { rank, totalTakers, percentile: parseFloat(percentile.toFixed(2)) }
        });
      })
    );

    console.log(`  Test "${test.title}": ${totalTakers} takers — ranks & percentiles updated`);
  }

  console.log(`\nRegular tests: ${fixedSections} SectionResults fixed, ${fixedAttempts} Attempts updated`);
}

async function fixSeriesTests() {
  console.log("\n=== FIXING SERIES TEST ATTEMPTS ===\n");

  const submittedAttempts = await prisma.seriesAttempt.findMany({
    where: { submittedAt: { not: null } },
    include: {
      seriesTest: {
        include: {
          sections: {
            include: {
              questions: true,
              _count: { select: { questions: true } }
            },
            orderBy: { order: "asc" }
          }
        }
      },
      sectionResults: true,
      answers: true
    }
  });

  console.log(`Found ${submittedAttempts.length} submitted series test attempts`);

  let fixedSections = 0;
  let fixedAttempts = 0;

  for (const attempt of submittedAttempts) {
    const test = attempt.seriesTest;
    let attemptTotalScore = 0;
    let attemptUpdated = false;

    for (const section of test.sections) {
      const existingSR = attempt.sectionResults.find(sr => sr.sectionId === section.id);

      const sectionQuestionIds = section.questions.map(q => q.id);
      const sectionAnswers = attempt.answers.filter(a => sectionQuestionIds.includes(a.questionId));

      let score = 0;
      let correct = 0;
      let wrong = 0;
      let unattempted = 0;

      for (const q of section.questions) {
        const ans = sectionAnswers.find(a => a.questionId === q.id);
        if (!ans || !ans.selected) {
          unattempted++;
        } else if (ans.selected.trim().toUpperCase() === q.correctOption.trim().toUpperCase()) {
          score += section.marksPerQ;
          correct++;
        } else {
          score -= section.negativeMarks;
          wrong++;
        }
      }
      score = Math.max(0, score);

      if (existingSR) {
        const needsUpdate =
          Math.abs(existingSR.score - score) > 0.001 ||
          existingSR.correct !== correct ||
          existingSR.wrong !== wrong ||
          existingSR.unattempted !== unattempted;

        if (needsUpdate) {
          await prisma.seriesSectionResult.update({
            where: { id: existingSR.id },
            data: { score, correct, wrong, unattempted }
          });
          console.log(`  Updated SeriesSectionResult ${existingSR.id}: score ${existingSR.score}→${score}, correct ${existingSR.correct}→${correct}, wrong ${existingSR.wrong}→${wrong}`);
          fixedSections++;
          attemptUpdated = true;
        }
      } else {
        await prisma.seriesSectionResult.create({
          data: {
            attemptId: attempt.id,
            sectionId: section.id,
            score,
            correct,
            wrong,
            unattempted,
            startedAt: attempt.currentSectionStartedAt || attempt.startedAt,
            submittedAt: attempt.submittedAt
          }
        });
        console.log(`  Created missing SeriesSectionResult for section ${section.subject}: score=${score}, correct=${correct}, wrong=${wrong}`);
        fixedSections++;
        attemptUpdated = true;
      }

      attemptTotalScore += score;
    }

    if (attemptUpdated || Math.abs((attempt.score || 0) - attemptTotalScore) > 0.001) {
      await prisma.seriesAttempt.update({
        where: { id: attempt.id },
        data: { score: attemptTotalScore }
      });
      console.log(`  Updated SeriesAttempt ${attempt.id}: score ${(attempt.score || 0)}→${attemptTotalScore}`);
      fixedAttempts++;
    }
  }

  // Recalculate ranks and percentiles per series test
  console.log("\n--- Recalculating ranks & percentiles for series tests ---");

  const seriesTestIds = [...new Set(submittedAttempts.map(a => a.seriesTestId))];

  for (const seriesTestId of seriesTestIds) {
    const test = await prisma.seriesTest.findUnique({
      where: { id: seriesTestId },
      include: { sections: { include: { _count: { select: { questions: true } } } } }
    });
    if (!test) continue;

    const maxTime = test.duration * 60;
    const attempts = await prisma.seriesAttempt.findMany({
      where: { seriesTestId, submittedAt: { not: null } }
    });

    const totalTakers = attempts.length;
    const attemptsWithTime = attempts.map(att => {
      const time = Math.floor((new Date(att.submittedAt!).getTime() - new Date(att.startedAt).getTime()) / 1000);
      return { id: att.id, score: att.score || 0, timeSpent: Math.min(time, maxTime) };
    });

    await Promise.all(
      attemptsWithTime.map(async (att) => {
        const rank = attemptsWithTime.filter(
          other => other.score > att.score || (other.score === att.score && other.timeSpent < att.timeSpent)
        ).length + 1;

        const percentile = totalTakers > 1 ? ((totalTakers - rank) / totalTakers) * 100 : 100;

        await prisma.seriesAttempt.update({
          where: { id: att.id },
          data: { rank, totalTakers, percentile: parseFloat(percentile.toFixed(2)) }
        });
      })
    );

    console.log(`  Series Test "${test.title}": ${totalTakers} takers — ranks & percentiles updated`);
  }

  console.log(`\nSeries tests: ${fixedSections} SeriesSectionResults fixed, ${fixedAttempts} SeriesAttempts updated`);
}

async function main() {
  console.log("========================================");
  console.log(" SCORING DATA FIX SCRIPT");
  console.log("========================================");

  try {
    await fixRegularTests();
    await fixSeriesTests();

    console.log("\n========================================");
    console.log(" ALL DONE — ALL DATA FIXED");
    console.log("========================================");
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
