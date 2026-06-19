import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
        return NextResponse.json({ error: "No admin found in database. Seed the DB first." }, { status: 400 });
      }
      adminId = admin.id;
    }

    const { title, defaultMarksPerQ, defaultNegativeMarks, cutoffMarks } = await req.json();

    if (!title || defaultMarksPerQ === undefined || defaultNegativeMarks === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newTest = await db.test.create({
      data: {
        title,
        duration: 0, // aggregate duration, starts at 0 and is summed as sections are added / published
        marksPerQ: parseFloat(defaultMarksPerQ),
        negativeMarks: parseFloat(defaultNegativeMarks),
        cutoffMarks: cutoffMarks ? parseFloat(cutoffMarks) : null,
        isLive: false,
        adminId
      }
    });

    return NextResponse.json(newTest);
  } catch (error: any) {
    console.error("Create Test Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
