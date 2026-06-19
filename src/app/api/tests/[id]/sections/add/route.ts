import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;
    const { subject, duration, marksPerQ, negativeMarks, questions } = await req.json();

    if (!subject || !duration || marksPerQ === undefined || negativeMarks === undefined || !questions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const test = await db.test.findUnique({
      where: { id: testId }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Determine sequence order for this section
    const sectionsCount = await db.testSection.count({
      where: { testId }
    });

    const newSection = await db.testSection.create({
      data: {
        testId,
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
    const allSections = await db.testSection.findMany({
      where: { testId }
    });
    const totalDuration = allSections.reduce((sum, s) => sum + s.duration, 0);

    await db.test.update({
      where: { id: testId },
      data: { duration: totalDuration }
    });

    return NextResponse.json({ success: true, sectionId: newSection.id });
  } catch (error: any) {
    console.error("Add Section Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
