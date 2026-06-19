import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { studentId, testSeriesId } = await req.json();

    if (!studentId || !testSeriesId) {
      return NextResponse.json({ error: "studentId and testSeriesId are required" }, { status: 400 });
    }

    const existing = await db.seriesPurchase.findUnique({
      where: { studentId_seriesId: { studentId, seriesId: testSeriesId } }
    });

    if (existing && existing.status === "success") {
      return NextResponse.json({ error: "Already enrolled in this series" }, { status: 400 });
    }

    const series = await db.testSeries.findUnique({ where: { id: testSeriesId } });
    if (!series || !series.isLive) {
      return NextResponse.json({ error: "Test series not found or inactive" }, { status: 404 });
    }

    if (existing) {
      await db.seriesPurchase.update({
        where: { id: existing.id },
        data: { amount: series.price, status: "success" }
      });
    } else {
      await db.seriesPurchase.create({
        data: {
          studentId,
          seriesId: testSeriesId,
          amount: series.price,
          razorpayOrderId: "direct_access_" + Date.now(),
          status: "success"
        }
      });
    }

    return NextResponse.json({
      success: true,
      directAccess: true
    });
  } catch (error: any) {
    console.error("Create Payment Order Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
