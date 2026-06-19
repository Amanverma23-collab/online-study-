import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get("batch");

    const where: any = { isLive: true };
    if (batch) {
      where.batch = { contains: batch };
    }

    const seriesList = await db.testSeries.findMany({
      where,
      include: {
        tests: {
          select: { id: true, title: true, order: true }
        },
        _count: { select: { purchases: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = seriesList.map((s) => ({
      ...s,
      batch: s.batch ? s.batch.split(",") : [],
      subjects: s.subjects ? s.subjects.split(",") : []
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch Live Series Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
