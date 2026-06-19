import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = params.attemptId;
    const { questionId, selected, isMarked, isVisited } = await req.json();

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const attempt = await db.seriesAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.submittedAt !== null) {
      return NextResponse.json({ error: "Attempt has already been finalized" }, { status: 400 });
    }

    const existingAnswer = await db.seriesAnswer.findFirst({
      where: {
        attemptId,
        questionId
      }
    });

    if (existingAnswer) {
      const updated = await db.seriesAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          selected: selected !== undefined ? selected : existingAnswer.selected,
          isMarked: isMarked !== undefined ? isMarked : existingAnswer.isMarked,
          isVisited: isVisited !== undefined ? isVisited : existingAnswer.isVisited
        }
      });
      return NextResponse.json({ success: true, answer: updated });
    } else {
      const created = await db.seriesAnswer.create({
        data: {
          attemptId,
          questionId,
          selected: selected || null,
          isMarked: isMarked || false,
          isVisited: isVisited || false
        }
      });
      return NextResponse.json({ success: true, answer: created });
    }
  } catch (error: any) {
    console.error("Save Series Answer Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
