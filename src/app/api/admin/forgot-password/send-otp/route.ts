import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting: Max 3 requests per email per 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const otpRequestCount = await db.passwordResetOTP.count({
      where: {
        email: normalizedEmail,
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

    // 2. Generic Message Response (Prevent email enumeration)
    const successResponse = NextResponse.json({
      success: true,
      message: "If this email is registered, an OTP has been sent."
    });

    const admin = await db.admin.findUnique({
      where: { email: normalizedEmail }
    });

    if (!admin) {
      // Return success directly, do not generate OTP or reveal email status
      return successResponse;
    }

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. "483920"

    // 4. Hash the OTP using bcryptjs
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // 5. Invalidate previous unused OTPs for this email
    await db.passwordResetOTP.updateMany({
      where: {
        email: normalizedEmail,
        isUsed: false
      },
      data: {
        isUsed: true
      }
    });

    // 6. Store OTP Hash
    await db.passwordResetOTP.create({
      data: {
        email: normalizedEmail,
        otpHash,
        expiresAt
      }
    });

    // 7. Send the email containing the plain-text OTP
    await sendOtpEmail(normalizedEmail, otp);

    return successResponse;
  } catch (error: any) {
    console.error("Forgot Password OTP Send Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
