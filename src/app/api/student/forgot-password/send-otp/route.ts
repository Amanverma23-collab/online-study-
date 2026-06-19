import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendSmsOtp } from "@/lib/sms";

export async function POST(req: Request) {
  try {
    const { mobile } = await req.json();

    if (!mobile) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      return NextResponse.json({ error: "Mobile number must be exactly 10 digits" }, { status: 400 });
    }

    // 1. Rate Limiting: Max 3 requests per mobile in 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const otpRequestCount = await db.studentPasswordResetOTP.count({
      where: {
        mobile: cleanedMobile,
        createdAt: {
          gte: fifteenMinutesAgo
        }
      }
    });

    if (otpRequestCount >= 3) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    // 2. Generic Message Response (Prevent enumeration attacks)
    const successResponse = NextResponse.json({
      success: true,
      message: "If this mobile number is registered, an OTP has been sent."
    });

    const student = await db.student.findUnique({
      where: { mobile: cleanedMobile }
    });

    if (!student) {
      // Return success directly, do not generate OTP or reveal mobile status
      return successResponse;
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Hash the OTP using bcryptjs
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // 5. Invalidate previous unused OTPs for this mobile
    await db.studentPasswordResetOTP.updateMany({
      where: {
        mobile: cleanedMobile,
        isUsed: false
      },
      data: {
        isUsed: true
      }
    });

    // 6. Store OTP Hash
    await db.studentPasswordResetOTP.create({
      data: {
        mobile: cleanedMobile,
        otpHash,
        expiresAt
      }
    });

    // 7. Send SMS OTP via MSG91 helper
    await sendSmsOtp(cleanedMobile, otp);

    return successResponse;
  } catch (error: any) {
    console.error("Student Forgot Password OTP Send Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
