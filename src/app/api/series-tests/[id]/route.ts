import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const test = await db.seriesTest.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            questions: {
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Series test not found" }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error: any) {
    console.error("Get Series Test Details Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
