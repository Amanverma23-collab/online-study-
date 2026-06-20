import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const liveClasses = await db.liveClass.findMany({
      orderBy: { classDate: "asc" },
    });

    return NextResponse.json(liveClasses);
  } catch (error: any) {
    console.error("Get Student Live Classes Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
