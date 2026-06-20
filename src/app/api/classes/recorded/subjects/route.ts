import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const subjects = await db.recordedClass.groupBy({
      by: ["subject"],
      _count: { id: true },
    });

    const result = subjects.map((g) => ({
      subject: g.subject,
      count: g._count.id,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Get Recorded Subjects Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
