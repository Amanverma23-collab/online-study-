"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, CheckCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = searchParams.get("mobile") || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const otpRef = useRef<HTMLInputElement>(null);

  // Focus on OTP input on mount
  useEffect(() => {
    if (otpRef.current) {
      otpRef.current.focus();
    }
  }, []);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!mobile) {
      setError("Mobile parameter is missing. Please start over.");
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("OTP must be a 6-digit numeric code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/student/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile,
          otp: otp.trim(),
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess("✅ Password reset successful! Redirecting to login...");
        setTimeout(() => {
          router.push("/");
        }, 2500);
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resending || !mobile) return;

    setError("");
    setSuccess("");
    setResending(true);

    try {
      const res = await fetch("/api/student/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend OTP.");
      } else {
        setSuccess("📩 A new OTP has been sent to your mobile number.");
        setCountdown(30);
      }
    } catch (err) {
      setError("Failed to connect. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#DDD8CC] rounded-[6px] p-8 shadow-sm relative">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center w-12 h-12 bg-[#F5F3EC] border border-[#DDD8CC] rounded-full text-[#C9A84C] mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="font-display font-bold text-2xl uppercase tracking-wider text-[#0D0F12] flex items-center gap-1">
          VERIFY RESET
        </h1>
        <span className="text-[11px] font-display font-semibold uppercase tracking-widest text-[#8B9E6A] mt-1.5 text-center px-4">
          OTP Sent to: <span className="text-[#0D0F12] font-mono text-sm block mt-0.5">{mobile}</span>
        </span>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-center gap-2 font-semibold">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 bg-green-50 border border-[#8B9E6A] rounded text-[#0D0F12] text-xs flex items-center gap-2 font-semibold">
          <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleVerifyAndReset} className="space-y-5">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">
              6-Digit OTP
            </label>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={countdown > 0 || resending || !mobile}
              className={`text-xs font-display font-bold uppercase tracking-wider transition ${
                countdown > 0 || resending || !mobile
                  ? "text-[#8B9E6A]/40 cursor-not-allowed"
                  : "text-[#C9A84C] hover:text-[#0D0F12]"
              }`}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : resending ? "Resending..." : "Resend OTP"}
            </button>
          </div>
          <input
            ref={otpRef}
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="w-full input-dark tracking-[1em] text-center font-bold text-lg"
            placeholder="000000"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
            New Password (Min 8 characters)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full input-dark text-sm pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9E6A] hover:text-[#0D0F12] transition focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full input-dark text-sm pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9E6A] hover:text-[#0D0F12] transition focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-sm uppercase font-bold tracking-widest py-3 mt-4"
        >
          {loading ? "Verifying..." : "Reset Password →"}
        </button>
      </form>

      <div className="flex justify-center mt-6">
        <Link
          href="/"
          className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] hover:text-[#C9A84C] transition"
        >
          ← Back to Login
        </Link>
      </div>

      <div className="mt-8 text-center text-[10px] font-display uppercase tracking-widest text-[#8B9E6A]/50">
        Officers Saga Candidate Portal &copy; 2026.
      </div>
    </div>
  );
}

export default function StudentVerifyOtpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3EC] px-4 text-[#0D0F12]">
      <Suspense fallback={
        <div className="w-full max-w-md bg-white border border-[#DDD8CC] rounded-[6px] p-8 shadow-sm flex items-center justify-center">
          <span className="text-[#C9A84C] font-display uppercase tracking-widest text-xs">Loading Security System...</span>
        </div>
      }>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}
