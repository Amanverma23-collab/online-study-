"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Star, Phone } from "lucide-react";

export default function StudentForgotPasswordPage() {
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/student/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: cleanedMobile })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP. Please try again.");
      } else {
        router.push(`/forgot-password/verify?mobile=${encodeURIComponent(cleanedMobile)}`);
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3EC] px-4 text-[#0D0F12]">
      <div className="w-full max-w-md bg-white border border-[#DDD8CC] rounded-[6px] p-8 shadow-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-[#F5F3EC] border border-[#DDD8CC] rounded-full text-[#C9A84C] mb-3">
            <Phone className="w-5 h-5" />
          </div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-wider text-[#0D0F12] flex items-center gap-1">
            RESET PASSWORD
          </h1>
          <span className="text-[11px] font-display font-semibold uppercase tracking-widest text-[#8B9E6A] mt-1.5">
            REQUEST MOBILE OTP
          </span>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-center gap-2 font-semibold">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
              10-Digit Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              className="w-full input-dark font-mono text-sm"
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary text-sm uppercase font-bold tracking-widest py-3 mt-4"
          >
            {loading ? "Sending OTP..." : "Send OTP →"}
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
    </div>
  );
}
