import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Endpoint deprecated. Use submit-section instead." }, { status: 410 });
}
