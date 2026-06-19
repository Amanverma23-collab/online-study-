import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { seriesId: string; testId: string } }
) {
  try {
    const { testId } = params;
    const { subject, duration, marksPerQ, negativeMarks, questions } = await req.json();

    if (!subject || !duration || marksPerQ === undefined || negativeMarks === undefined || !questions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const test = await db.seriesTest.findUnique({
      where: { id: testId }
    });

    if (!test) {
      return NextResponse.json({ error: "Series test not found" }, { status: 404 });
    }

    // Count existing sections for this series test
    const sectionsCount = await db.seriesTestSection.count({
      where: { seriesTestId: testId }
    });

    const newSection = await db.seriesTestSection.create({
      data: {
        seriesTestId: testId,
        subject,
        order: sectionsCount + 1,
        duration: parseInt(duration),
        marksPerQ: parseFloat(marksPerQ),
        negativeMarks: parseFloat(negativeMarks),
        questions: {
          create: questions.map((q: any) => ({
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            explanation: q.explanation || null,
            order: q.order
          }))
        }
      }
    });

    // Update overall test duration
    const allSections = await db.seriesTestSection.findMany({
      where: { seriesTestId: testId }
    });
    const totalDuration = allSections.reduce((sum, s) => sum + s.duration, 0);

    await db.seriesTest.update({
      where: { id: testId },
      data: { duration: totalDuration }
    });

    return NextResponse.json({ success: true, sectionId: newSection.id });
  } catch (error: any) {
    console.error("Add Series Section Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
