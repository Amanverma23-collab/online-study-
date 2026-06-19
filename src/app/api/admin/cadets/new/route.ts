import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    const where: any = {};
    if (since) {
      where.createdAt = { gt: new Date(since) };
    }

    const count = await db.student.count({ where });

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("Check New Cadets Error:", error);
    return NextResponse.json({ count: 0 });
  }
}
