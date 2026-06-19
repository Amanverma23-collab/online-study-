import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { seriesId: string } }
) {
  try {
    const seriesId = params.seriesId;
    const { title, defaultMarksPerQ, defaultNegativeMarks } = await req.json();

    if (!title || defaultMarksPerQ === undefined || defaultNegativeMarks === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const series = await db.testSeries.findUnique({
      where: { id: seriesId }
    });

    if (!series) {
      return NextResponse.json({ error: "Test series not found" }, { status: 404 });
    }

    // Determine sequence number (order) within the series
    const existingCount = await db.seriesTest.count({
      where: { seriesId }
    });
    const order = existingCount + 1;

    const newTest = await db.seriesTest.create({
      data: {
        seriesId,
        title,
        duration: 0,
        negativeMarks: parseFloat(defaultNegativeMarks),
        marksPerQ: parseFloat(defaultMarksPerQ),
        order
      }
    });

    return NextResponse.json({ success: true, test: newTest });
  } catch (error: any) {
    console.error("Add Series Test Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
