"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Star, ShieldAlert, Award, Eye, EyeOff, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { signIn } from "next-auth/react";

function StudentLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const [view, setView] = useState<"student" | "teacher">("student");
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

  // Teacher states
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "teacher") {
      setView("teacher");
    }
  }, [searchParams]);

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: teacherEmail,
        password: teacherPassword,
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
        <AnimatePresence mode="wait">
          {view === "student" ? (
            <motion.div
              key="student"
              initial={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 30,
                rotateX: shouldReduceMotion ? 0 : -8
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0
              }}
              exit={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : -30,
                rotateX: shouldReduceMotion ? 0 : 8
              }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ transformPerspective: 1000, width: "100%", maxWidth: "28rem" }}
              className="bg-white border border-[#DDD8CC] rounded-[6px] p-8 lg:my-auto relative max-lg:my-4 shadow-sm"
            >
              {/* Close button for Mobile Modal overlay */}
              <button
                onClick={() => setShowMobileAuth(false)}
                className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Tabs header */}
              <div className="relative flex border-b border-[#DDD8CC] mb-6 font-display font-bold uppercase tracking-wider text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDirection(-1);
                    setActiveTab("login");
                    setError("");
                    setPassword("");
                    setConfirmPassword("");
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className={`flex-1 py-3 text-center transition-colors duration-200 z-10 ${
                    activeTab === "login"
                      ? "text-[#C9A84C]"
                      : "text-[#8B9E6A] hover:text-[#0D0F12]"
                  }`}
                >
                  LOG IN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirection(1);
                    setActiveTab("register");
                    setError("");
                    setBatch("");
                    setPassword("");
                    setConfirmPassword("");
                    setShowPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className={`flex-1 py-3 text-center transition-colors duration-200 z-10 ${
                    activeTab === "register"
                      ? "text-[#C9A84C]"
                      : "text-[#8B9E6A] hover:text-[#0D0F12]"
                  }`}
                >
                  REGISTER
                </button>
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px] bg-[#C9A84C]"
                  layout
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{
                    width: "50%",
                    x: activeTab === "register" ? "100%" : "0%"
                  }}
                />
              </div>

              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  <motion.div
                    key={activeTab}
                    custom={direction}
                    variants={{
                      enter: (dir: number) => ({
                        x: shouldReduceMotion ? 0 : (dir > 0 ? 60 : -60),
                        opacity: 0
                      }),
                      center: {
                        x: 0,
                        opacity: 1
                      },
                      exit: (dir: number) => ({
                        x: shouldReduceMotion ? 0 : (dir > 0 ? -60 : 60),
                        opacity: 0
                      })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                    className="w-full"
                  >
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

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
                            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                          {activeTab === "login" && (
                            <div className="flex justify-end mt-2">
                              <Link
                                href="/forgot-password"
                                className="text-[11px] font-display font-semibold uppercase tracking-wider text-[#C9A84C] hover:text-[#0D0F12] transition"
                              >
                                Forgot Password?
                              </Link>
                            </div>
                          )}
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

                    {activeTab === "login" && (
                      <div className="mt-6 pt-4 border-t border-[#DDD8CC] text-center">
                        <motion.button
                          type="button"
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => {
                            setView("teacher");
                            setError("");
                            setTeacherEmail("");
                            setTeacherPassword("");
                            setShowTeacherPassword(false);
                          }}
                          className="text-xs font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#F0D080] transition inline-flex items-center gap-1"
                        >
                          Teacher Access Portal &rarr;
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="teacher"
              initial={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 30,
                rotateX: shouldReduceMotion ? 0 : -8
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0
              }}
              exit={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : -30,
                rotateX: shouldReduceMotion ? 0 : 8
              }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ transformPerspective: 1000, width: "100%", maxWidth: "28rem" }}
              className="bg-[#1C2415] border border-[#2E3B1E] border-t-[3px] border-t-[#C9A84C] rounded-[6px] p-8 lg:my-auto relative max-lg:my-4 shadow-xl"
            >
              {/* Close button for Mobile Modal overlay */}
              <button
                onClick={() => setShowMobileAuth(false)}
                className="lg:hidden absolute top-4 right-4 p-2 text-[#8B9E6A] hover:text-[#EEF0E8] transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center w-12 h-12 bg-[#2E3B1E] border border-[#C9A84C] rounded text-[#C9A84C] mb-3">
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <h3 className="font-display font-bold text-2xl uppercase tracking-wider text-[#EEF0E8] flex items-center gap-1">
                  ADMIN LOGIN
                </h3>
                <span className="text-[11px] font-display font-semibold uppercase tracking-widest text-[#8B9E6A] mt-1.5">
                  SECURE ACCESS SYSTEM
                </span>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-red-950/20 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleTeacherSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                    Teacher Email
                  </label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
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
                      type={showTeacherPassword ? "text" : "password"}
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="w-full input-dark pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9E6A] hover:text-[#EEF0E8] transition focus:outline-none"
                    >
                      {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Link
                      href="/admin/forgot-password"
                      className="text-[11px] font-display font-semibold uppercase tracking-wider text-[#C9A84C] hover:text-[#EEF0E8] transition"
                    >
                      Forgot Password?
                    </Link>
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

              <div className="mt-8 pt-4 border-t border-[#2E3B1E] text-center">
                <motion.button
                  type="button"
                  whileHover={{ x: -4 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    setView("student");
                    setError("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-xs font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#F0D080] transition inline-flex items-center gap-1"
                >
                  &larr; Student Access Portal
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#0D0F12]" />}>
      <StudentLoginPageContent />
    </Suspense>
  );
}
