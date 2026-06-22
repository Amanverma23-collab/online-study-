import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;

    const test = await db.test.findUnique({
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
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (test.sections.length === 0) {
      return NextResponse.json({ error: "Cannot publish a test with no sections. Add at least one section." }, { status: 400 });
    }

    const totalQuestions = test.sections.reduce((sum, s) => sum + s.questions.length, 0);
    const totalDuration = test.sections.reduce((sum, s) => sum + s.duration, 0);

    const updatedTest = await db.test.update({
      where: { id: testId },
      data: {
        isLive: true,
        duration: totalDuration
      }
    });

    // Notify students of the published test
    try {
      await createNotification({
        recipientType: "STUDENT",
        recipientId: null, // broadcast
        type: "NEW_TEST",
        title: `New test available: ${updatedTest.title}`,
        message: `A new ${updatedTest.batch} test is now live. Attempt it now!`,
        link: "/student/dashboard",
        batch: updatedTest.batch
      });
    } catch (notifyError) {
      console.error("Non-critical: Failed to send test publication notification:", notifyError);
    }

    return NextResponse.json({
      success: true,
      test: updatedTest,
      sectionsCount: test.sections.length,
      questionsCount: totalQuestions,
      totalDuration
    });
  } catch (error: any) {
    console.error("Publish Test Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
