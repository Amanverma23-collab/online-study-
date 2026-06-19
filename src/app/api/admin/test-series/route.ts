import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const series = await db.testSeries.findMany({
      include: {
        tests: {
          select: { id: true, title: true, order: true }
        },
        _count: { select: { purchases: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // Map database comma-separated strings back to arrays
    const formattedSeries = series.map((s) => ({
      ...s,
      batch: s.batch ? s.batch.split(",") : [],
      subjects: s.subjects ? s.subjects.split(",") : []
    }));

    return NextResponse.json(formattedSeries);
  } catch (error: any) {
    console.error("Fetch Test Series Admin Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let adminId = (session?.user as any)?.id;

    if (adminId) {
      const adminExists = await db.admin.findUnique({ where: { id: adminId } });
      if (!adminExists) {
        adminId = null;
      }
    }

    if (!adminId) {
      const admin = await db.admin.findFirst();
      if (!admin) {
        return NextResponse.json({ error: "No admin found in database." }, { status: 400 });
      }
      adminId = admin.id;
    }

    const { title, description, batch, price, subjects } = await req.json();

    if (!title || !description || !batch || price === undefined || !subjects) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Convert arrays from frontend to comma-separated strings for SQLite
    const batchStr = Array.isArray(batch) ? batch.join(",") : String(batch);
    const subjectsStr = Array.isArray(subjects) ? subjects.join(",") : String(subjects);

    const series = await db.testSeries.create({
      data: {
        title,
        description,
        batch: batchStr,
        price: parseFloat(price),
        subjects: subjectsStr,
        isLive: false,
        adminId
      }
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
    console.error("Create Test Series Admin Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
