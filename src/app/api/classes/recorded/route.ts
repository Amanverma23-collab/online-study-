import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");

    if (!subject) {
      return NextResponse.json(
        { error: "Subject query parameter is required" },
        { status: 400 }
      );
    }

    const recordedClasses = await db.recordedClass.findMany({
      where: { subject },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recordedClasses);
  } catch (error: any) {
    console.error("Get Student Recorded Classes Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
