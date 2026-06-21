import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isContentVisibleToStudent } from "@/lib/batch";

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

    const visiblePurchases = purchases.filter((p) =>
      isContentVisibleToStudent(p.series.batch, student.batch)
    );

    const formatted = visiblePurchases.map((p) => ({
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

