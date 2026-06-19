"use client";

import React, { useState } from "react";
import { Star, ShieldAlert, Award, Eye, EyeOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showMobileAuth, setShowMobileAuth] = useState(false);
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }

    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    if (activeTab === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const endpoint = activeTab === "login" ? "/api/student/login" : "/api/student/register";
      const payload =
        activeTab === "login"
          ? { mobile: cleanedMobile, password }
          : { name, fatherName, mobile: cleanedMobile, batch, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.student) {
        localStorage.setItem("studentId", data.student.id);
        localStorage.setItem("studentName", data.student.name);
        localStorage.setItem("studentMobile", data.student.mobile);
        localStorage.setItem("studentBatch", data.student.batch);
        
        router.push("/student/dashboard");
      } else {
        setError(data.error || "Failed to proceed.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row bg-[#0D0F12] overflow-hidden">
      {/* LEFT HALF (Dark #0D0F12) */}
      <div className="flex-1 bg-[#0D0F12] p-8 md:p-16 flex flex-col justify-between relative overflow-hidden h-full">
        {/* Subtle pattern / faint topographic simulator lines in #1C2415 */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1C2415" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Brand details */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-[#C9A84C] rounded flex items-center justify-center text-[#0D0F12] shadow">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <span className="font-display font-bold text-lg uppercase tracking-wider text-[#EEF0E8]">Officers Saga</span>
        </div>

        {/* Center Pitch */}
        <div className="my-auto py-12 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] px-3.5 py-1 rounded text-xs font-display font-bold uppercase tracking-widest mb-6">
            <Award className="w-3.5 h-3.5" /> Military Prep briefing
          </div>
          <h2 className="font-display font-bold text-[48px] text-[#C9A84C] uppercase tracking-[0.15em] leading-tight">
            OFFICERS SAGA
          </h2>
          <p className="text-[14px] font-display font-semibold uppercase tracking-[0.3em] text-[#8B9E6A] mt-2.5">
            PREPARE &middot; COMPETE &middot; SERVE
          </p>
          <p className="font-body text-sm text-[#EEF0E8]/70 mt-6 leading-relaxed mb-6">
            Every candidate dreams of a commission. This briefing portal compiles exam templates, live session evaluations, and accuracy analysis designed for those chasing the toughest dream.
          </p>

          {/* Get Started Button for Mobile viewports */}
          <button
            onClick={() => setShowMobileAuth(true)}
            className="lg:hidden w-full btn-primary flex items-center justify-center gap-2 mt-4 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition duration-200"
          >
            GET STARTED &rarr;
          </button>
        </div>

        {/* Bottom Location */}
        <div className="text-xs font-display uppercase tracking-widest text-[#8B9E6A] relative z-10">
          NDA & CDS Coaching — Sikar, Rajasthan
        </div>
      </div>

      {/* RIGHT HALF (Cream #F5F3EC) */}
      <div
        className={`flex-1 p-8 md:p-16 items-center justify-center lg:h-full lg:overflow-y-auto ${
          showMobileAuth
            ? "max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:bg-[#F5F3EC] flex max-lg:flex-col max-lg:justify-start max-lg:py-12 max-lg:overflow-y-auto"
            : "hidden lg:flex lg:bg-[#F5F3EC]"
        }`}
      >
        <div className="w-full max-w-md bg-white border border-[#DDD8CC] rounded-[6px] p-8 lg:my-auto relative max-lg:my-4">
          {/* Close button for Mobile Modal overlay */}
          <button
            onClick={() => setShowMobileAuth(false)}
            className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 transition z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Tabs header */}
          <div className="flex border-b border-[#DDD8CC] mb-6 font-display font-bold uppercase tracking-wider text-xs">
            <button
              onClick={() => {
                setActiveTab("login");
                setError("");
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "login"
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
              }`}
            >
              LOG IN
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setError("");
                setBatch("");
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                activeTab === "register"
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
              }`}
            >
              REGISTER
            </button>
          </div>

          <div className="text-center mb-6">
            <h3 className="font-display font-bold text-lg sm:text-[24px] uppercase tracking-wider text-[#0D0F12] whitespace-nowrap">
              {activeTab === "login" ? "STUDENT LOGIN" : "STUDENT REGISTRATION"}
            </h3>
            <p className="text-xs text-[#8B9E6A] font-semibold mt-1">
              {activeTab === "login" 
                ? "Enter your registered parameters below" 
                : "Initialize your briefing parameters"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-lg:max-h-[250px] max-lg:overflow-y-auto max-lg:pr-1 space-y-4">
              {activeTab === "register" && (
              <>
                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full input-dark"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Enter father's name"
                    className="w-full input-dark"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                maxLength={10}
                className="w-full input-dark font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full input-dark text-sm pr-10"
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

            {activeTab === "register" && (
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full input-dark text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9E6A] hover:text-[#EEF0E8] transition focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "register" && (
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                  Select Batch
                </label>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full input-dark bg-[#1C2415] text-[#EEF0E8] focus:outline-none"
                  required
                >
                  <option value="" disabled hidden>Select Batch</option>
                  <option value="NDA">NDA</option>
                  <option value="CDS">CDS</option>
                  <option value="OTA">OTA</option>
                </select>
              </div>
            )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-6 text-sm"
            >
              {loading 
                ? "Initializing..." 
                : activeTab === "login" ? "ENTER PORTAL →" : "CREATE ACCOUNT & ENTER →"}
            </button>
          </form>

          {activeTab === "login" && (
            <p className="text-xs text-center text-[#8B9E6A] font-semibold mt-6">
              First time? Switch to the **Register** tab to create your credentials parameters.
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-[#DDD8CC] text-center">
            <Link
              href="/admin/login"
              className="text-xs font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#F0D080] transition inline-flex items-center gap-1"
            >
              Teacher Access Portal &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
