"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Star, Mail } from "lucide-react";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP. Please try again.");
      } else {
        // Redirect to verification screen with email as query param
        router.push(`/admin/forgot-password/verify?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] px-4">
      <div className="w-full max-w-md bg-[#1C2415] rounded border-t-[3px] border-t-[#C9A84C] border border-[#2E3B1E] p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-[#2E3B1E] border border-[#C9A84C] rounded text-[#C9A84C] mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-wider text-[#EEF0E8] flex items-center gap-1">
            RESET PASSWORD
          </h1>
          <span className="text-[11px] font-display font-semibold uppercase tracking-widest text-[#8B9E6A] mt-1.5">
            REQUEST ACCESS OTP
          </span>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/20 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
              Teacher Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full input-dark"
              placeholder="teacher@officerssaga.com"
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
            href="/admin/login"
            className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] hover:text-[#C9A84C] transition"
          >
            ← Back to Login
          </Link>
        </div>

        <div className="mt-8 text-center text-[10px] font-display uppercase tracking-widest text-[#8B9E6A]/50">
          Officers Saga Admin Portal &copy; 2026. SECURE ACCESS ONLY.
        </div>
      </div>
    </div>
  );
}
