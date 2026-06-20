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

    const liveClasses = await db.liveClass.findMany({
      where: { subject },
      orderBy: { classDate: "desc" },
    });

    return NextResponse.json(liveClasses);
  } catch (error: any) {
    console.error("Get Live Classes Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
