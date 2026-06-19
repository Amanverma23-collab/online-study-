import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch latest unused, non-expired OTP record for this email
    const otpRecord = await db.passwordResetOTP.findFirst({
      where: {
        email: normalizedEmail,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Please request a new one." },
        { status: 400 }
      );
    }

    // 2. Compare OTP against stored hash
    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP. Please request a new one." },
        { status: 400 }
      );
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update Admin password and mark OTP as used
    // Use transaction to ensure both DB updates succeed atomically
    await db.$transaction([
      db.admin.update({
        where: { email: normalizedEmail },
        data: { password: hashedPassword }
      }),
      db.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Password reset successful! Please log in."
    });
  } catch (error: any) {
    console.error("Forgot Password OTP Verify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
