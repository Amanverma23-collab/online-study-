import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { seriesId: string } }
) {
  try {
    const seriesId = params.seriesId;

    const series = await db.testSeries.findUnique({
      where: { id: seriesId },
      include: { tests: true }
    });

    if (!series) {
      return NextResponse.json({ error: "Test series not found" }, { status: 404 });
    }

    if (series.tests.length === 0) {
      return NextResponse.json({ error: "Cannot publish an empty test series. Add at least one test." }, { status: 400 });
    }

    const updatedSeries = await db.testSeries.update({
      where: { id: seriesId },
      data: { isLive: true }
    });

    return NextResponse.json({ success: true, series: updatedSeries });
  } catch (error: any) {
    console.error("Publish Test Series Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
