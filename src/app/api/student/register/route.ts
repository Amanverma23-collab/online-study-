import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { name, fatherName, mobile, batch, password } = await req.json();

    if (!name || !fatherName || !mobile || !batch || !password) {
      return NextResponse.json(
        { error: "Name, Father's Name, Mobile Number, Password, and Batch are required" },
        { status: 400 }
      );
    }

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      return NextResponse.json(
        { error: "Mobile number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    const allowedBatches = ["NDA", "CDS", "OTA"];
    if (!allowedBatches.includes(batch.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid batch selection. Choose NDA, CDS, or OTA." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingStudent = await db.student.findUnique({
      where: { mobile: cleanedMobile }
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "This mobile number is already registered. Please switch to the Login tab." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the student
    const student = await db.student.create({
      data: {
        name,
        fatherName,
        mobile: cleanedMobile,
        password: hashedPassword,
        batch: batch.toUpperCase()
      }
    });

    // Notify admins of the registration
    try {
      await createNotification({
        recipientType: "ADMIN",
        recipientId: null, // broadcast to all admins
        type: "NEW_STUDENT",
        title: `New cadet registered: ${student.name}`,
        message: `${student.name} (${student.mobile}) joined the platform.`,
        link: "/admin/cadets"
      });
    } catch (notifyError) {
      console.error("Non-critical: Failed to send registration notification:", notifyError);
    }

    return NextResponse.json({
      success: true,
      student
    });
  } catch (error: any) {
    console.error("Student Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
