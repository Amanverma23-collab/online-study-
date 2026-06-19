import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { mobile, password } = await req.json();

    if (!mobile || !password) {
      return NextResponse.json({ error: "Mobile number and password are required" }, { status: 400 });
    }

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      return NextResponse.json({ error: "Mobile number must be exactly 10 digits" }, { status: 400 });
    }

    let student = await db.student.findUnique({
      where: { mobile: cleanedMobile }
    });

    if (!student) {
      return NextResponse.json(
        { error: "This mobile number is not registered. Please register first using the Register tab." },
        { status: 404 }
      );
    }

    if (student.status === "BANNED") {
      return NextResponse.json({ error: "Access Denied. This candidate account has been banned." }, { status: 403 });
    }

    const isValid = student.password === ""
      ? true
      : await bcrypt.compare(password, student.password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (student.password === "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      student = await db.student.update({
        where: { id: student.id },
        data: { password: hashedPassword }
      });
    }

    return NextResponse.json({
      success: true,
      student
    });
  } catch (error: any) {
    console.error("Student Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
