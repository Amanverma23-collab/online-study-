import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const seriesId = params.id;

    const series = await db.testSeries.findUnique({
      where: { id: seriesId },
      include: {
        tests: {
          select: { id: true, title: true, order: true }
        }
      }
    });

    if (!series) {
      return NextResponse.json({ error: "Test series not found" }, { status: 404 });
    }

    const formatted = {
      ...series,
      batch: series.batch ? series.batch.split(",") : [],
      subjects: series.subjects ? series.subjects.split(",") : []
    };

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch Series Details Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
