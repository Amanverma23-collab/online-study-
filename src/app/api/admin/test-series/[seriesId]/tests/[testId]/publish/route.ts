import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { seriesId: string; testId: string } }
) {
  try {
    const { testId } = params;

    const test = await db.seriesTest.findUnique({
      where: { id: testId },
      include: {
        sections: {
          include: {
            questions: { select: { id: true } }
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Series test not found" }, { status: 404 });
    }

    if (test.sections.length === 0) {
      return NextResponse.json({ error: "Cannot publish a test with no sections. Add at least one section." }, { status: 400 });
    }

    const totalQuestions = test.sections.reduce((sum, s) => sum + s.questions.length, 0);
    const totalDuration = test.sections.reduce((sum, s) => sum + s.duration, 0);

    const updatedTest = await db.seriesTest.update({
      where: { id: testId },
      data: {
        duration: totalDuration
      }
    });

    return NextResponse.json({
      success: true,
      test: updatedTest,
      sectionsCount: test.sections.length,
      questionsCount: totalQuestions,
      totalDuration
    });
  } catch (error: any) {
    console.error("Publish Series Test Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
