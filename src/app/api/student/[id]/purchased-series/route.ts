import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

    const purchases = await db.seriesPurchase.findMany({
      where: {
        studentId,
        status: "success"
      },
      include: {
        series: {
          include: {
            tests: {
              select: { id: true, title: true, order: true }
            }
          }
        }
      }
    });

    const formatted = purchases.map((p) => ({
      purchaseId: p.id,
      purchasedAt: p.purchasedAt,
      amount: p.amount,
      series: {
        ...p.series,
        batch: p.series.batch ? p.series.batch.split(",") : [],
        subjects: p.series.subjects ? p.series.subjects.split(",") : []
      }
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch Purchased Series Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
