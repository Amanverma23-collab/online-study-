import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

    const student = await db.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.status === "BANNED") {
      return NextResponse.json({ error: "Access Denied. This candidate account has been banned." }, { status: 403 });
    }

    const attempts = await db.attempt.findMany({
      where: { studentId },
      include: {
        test: {
          include: {
            sections: {
              select: {
                subject: true,
                marksPerQ: true,
                _count: {
                  select: { questions: true }
                }
              }
            }
          }
        }
      },
      orderBy: { startedAt: "desc" }
    });

    const formattedAttempts = attempts.map(att => {
      if (!att.test) return att;
      const subjectsList = att.test.sections.map(s => s.subject).join(", ");
      const totalMarks = att.test.sections.reduce((sum, sec) => sum + (sec.marksPerQ * sec._count.questions), 0);
      const { sections, ...testRest } = att.test;
      return {
        ...att,
        test: {
          ...testRest,
          subject: subjectsList,
          totalMarks
        }
      };
    });

    return NextResponse.json(formattedAttempts);
  } catch (error: any) {
    console.error("Fetch Student Attempts Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
