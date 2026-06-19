"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Star, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] px-4">
      <div className="w-full max-w-md bg-[#1C2415] rounded border-t-[3px] border-t-[#C9A84C] border border-[#2E3B1E] p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-[#2E3B1E] border border-[#C9A84C] rounded text-[#C9A84C] mb-3">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-wider text-[#EEF0E8] flex items-center gap-1">
            ADMIN LOGIN
          </h1>
          <span className="text-[11px] font-display font-semibold uppercase tracking-widest text-[#8B9E6A] mt-1.5">
            SECURE ACCESS SYSTEM
          </span>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/20 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
              Teacher Email
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

          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full input-dark pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9E6A] hover:text-[#EEF0E8] transition focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary text-sm uppercase font-bold tracking-widest py-3 mt-4"
          >
            {loading ? "Authenticating..." : "Login →"}
          </button>
        </form>
        
        <div className="mt-8 text-center text-[10px] font-display uppercase tracking-widest text-[#8B9E6A]/50">
          Officers Saga Admin Portal &copy; 2026. SECURE ACCESS ONLY.
        </div>
      </div>
    </div>
  );
}
