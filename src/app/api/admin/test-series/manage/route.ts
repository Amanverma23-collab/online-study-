import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  try {
    const { id, isLive } = await req.json();

    if (!id || isLive === undefined) {
      return NextResponse.json({ error: "id and isLive are required" }, { status: 400 });
    }

    const series = await db.testSeries.update({
      where: { id },
      data: { isLive }
    });

    return NextResponse.json({
      success: true,
      series: {
        ...series,
        batch: series.batch ? series.batch.split(",") : [],
        subjects: series.subjects ? series.subjects.split(",") : []
      }
    });
  } catch (error: any) {
    console.error("Toggle Test Series Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Cascade delete is defined in schema.prisma, so deleting testSeries will delete everything else
    await db.testSeries.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Test Series Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
