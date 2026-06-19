import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const tests = await db.test.findMany({
      include: {
        sections: {
          include: {
            _count: {
              select: { questions: true }
            }
          }
        },
        _count: {
          select: { attempts: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const formattedTests = tests.map(t => {
      const questionsCount = t.sections.reduce((sum, sec) => sum + sec._count.questions, 0);
      const totalMarks = t.sections.reduce((sum, sec) => sum + sec._count.questions * sec.marksPerQ, 0);
      const subject = t.sections.map(s => s.subject).join(", ") || "—";
      const { sections, ...rest } = t;
      return {
        ...rest,
        subject,
        totalMarks,
        _count: {
          questions: questionsCount,
          attempts: t._count.attempts
        }
      };
    });

    return NextResponse.json(formattedTests);
  } catch (error: any) {
    console.error("Fetch All Tests Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
