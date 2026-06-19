import { Resend } from "resend";
import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, otp: string) {
  const subject = "Officers Saga — Password Reset OTP";
  const textContent = `Your OTP for resetting your Officers Saga admin password is:

${otp}

This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.`;

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #2e3b1e; background-color: #0d0f12; color: #eef0e8; border-radius: 4px;">
      <div style="text-align: center; border-bottom: 2px solid #c9a84c; padding-bottom: 15px; margin-bottom: 20px;">
        <h2 style="color: #eef0e8; font-size: 20px; margin: 0; letter-spacing: 1px; font-weight: bold; text-transform: uppercase;">OFFICERS SAGA</h2>
        <span style="font-size: 10px; color: #8b9e6a; letter-spacing: 2px; text-transform: uppercase;">Secure Access System</span>
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: #b0c098;">Your OTP for resetting your admin account password is:</p>
      <div style="background-color: #1c2415; border: 1px solid #2e3b1e; border-left: 4px solid #c9a84c; padding: 15px; text-align: center; margin: 25px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #c9a84c;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #8b9e6a; line-height: 1.5;">This OTP is valid for <strong>10 minutes</strong>. If you did not request this password reset, please ignore this email.</p>
      <div style="margin-top: 30px; border-top: 1px solid #2e3b1e; padding-top: 15px; text-align: center; font-size: 10px; color: #8b9e6a; opacity: 0.6;">
        Officers Saga Admin Portal &copy; 2026. Secure Access Only.
      </div>
    </div>
  `;

  // 1. Resend Integration
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Officers Saga <noreply@yourdomain.com>", // standard/placeholder
        to: email,
        subject,
        html: htmlContent,
        text: textContent
      });
      console.log(`[Email] OTP sent to ${email} via Resend`);
      return { success: true, provider: "resend" };
    } catch (err) {
      console.error("[Email] Resend error:", err);
      // Fall through to next providers if Resend fails
    }
  }

  // 2. Gmail / SMTP Integration
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      await transporter.sendMail({
        from: `"Officers Saga" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[Email] OTP sent to ${email} via Gmail SMTP`);
      return { success: true, provider: "gmail" };
    } catch (err) {
      console.error("[Email] Gmail SMTP error:", err);
    }
  }

  // 3. Fallback/Development Console Logging
  console.warn("=================================================");
  console.warn("⚠️ EMAIL NOT SENT: No Resend API Key or Gmail App Credentials configured.");
  console.warn(`To: ${email}`);
  console.warn(`Subject: ${subject}`);
  console.warn(`OTP Code: ${otp}`);
  console.warn("=================================================");
  return { success: true, provider: "console", otp };
}
