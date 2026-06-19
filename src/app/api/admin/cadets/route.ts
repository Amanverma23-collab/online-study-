import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const students = await db.student.findMany({
      include: {
        attempts: {
          select: {
            id: true,
            submittedAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const cadets = students.map((s) => ({
      id: s.id,
      name: s.name,
      fatherName: s.fatherName,
      mobile: s.mobile,
      status: s.status,
      batch: s.batch,
      attemptsCount: s.attempts.length,
      submittedAttemptsCount: s.attempts.filter(a => a.submittedAt !== null).length
    }));

    return NextResponse.json(cadets);
  } catch (error: any) {
    console.error("Fetch Cadets Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
