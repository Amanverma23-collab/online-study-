"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Lock, Unlock, CheckCircle, ChevronRight, Play, Star, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";

const formatSubject = (sub: string) => {
  if (!sub) return "";
  const trimSub = sub.trim();
  const lower = trimSub.toLowerCase();
  if (lower === "general knowledge") return "GK";
  if (lower === "mathematics") return "Maths";
  return trimSub;
};

interface SeriesTestWithStatus {
  id: string;
  title: string;
  subject: string;
  duration: number;
  marksPerQ: number;
  order: number;
  status: "completed" | "unlocked" | "locked";
  score: number | null;
  attemptId: string | null;
  _count?: { questions: number };
}

interface SeriesConfig {
  id: string;
  title: string;
  description: string;
}

export default function SeriesTestsPage({ params }: { params: { seriesId: string } }) {
  const seriesId = params.seriesId;
  const router = useRouter();

  const [studentId, setStudentId] = useState<string | null>(null);
  const [series, setSeries] = useState<SeriesConfig | null>(null);
  const [tests, setTests] = useState<SeriesTestWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);

  useEffect(() => {
    const sId = localStorage.getItem("studentId");
    if (!sId) {
      router.push("/");
      return;
    }
    setStudentId(sId);
    fetchSeriesDetails();
    fetchTests(sId);
  }, [seriesId]);

  const fetchSeriesDetails = async () => {
    try {
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const data = await res.json();
        setSeries(data);
      }
    } catch (err) {
      console.error("Failed to fetch series details:", err);
    }
  };

  const fetchTests = async (sId: string) => {
    try {
      const res = await fetch(`/api/series/${seriesId}/tests?studentId=${sId}`);
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      } else if (res.status === 403) {
        alert("Access Denied: You do not have access to this test series. Please purchase first.");
        router.push(`/student/series/${seriesId}`);
      } else {
        alert("Failed to load tests.");
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error("Failed to load tests:", err);
      router.push("/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId: string) => {
    if (!studentId || startingTestId) return;
    setStartingTestId(testId);
    try {
      const res = await fetch("/api/series-attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, seriesTestId: testId })
      });
      const data = await res.json();
      if (res.ok && data.attempt) {
        router.push(`/student/series/${seriesId}/test/${testId}`);
      } else {
        alert(data.error || "Failed to start test attempt.");
        setStartingTestId(null);
      }
    } catch (err) {
      console.error("Failed to start attempt:", err);
      alert("Network error. Failed to start test.");
      setStartingTestId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
      </div>
    );
  }

  const allCompleted = tests.length > 0 && tests.every((t) => t.status === "completed");

  return (
    <div className="h-screen overflow-hidden bg-[#F5F3EC] flex flex-col text-[#0D0F12] font-body">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#0D0F12] py-4 px-6 md:px-12 text-[#EEF0E8] shadow flex justify-between items-center border-b border-[#2E3B1E] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/student/dashboard?tab=series" className="p-1 border border-[#2E3B1E] bg-[#1C2415] rounded hover:bg-[#2E3B1E] transition">
            <ArrowLeft className="w-4 h-4 text-[#C9A84C]" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-md tracking-wider uppercase">Officers Saga</h1>
            <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest leading-none">Briefing Board</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-8 overflow-y-auto no-scrollbar">
        {series && (
          <div>
            <h2 className="font-display font-bold text-2xl uppercase tracking-wider text-[#0D0F12]">{series.title}</h2>
            <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Briefing sequence unlock & progress board</p>
          </div>
        )}

        {/* Completion Banner */}
        {allCompleted && (
          <div className="bg-[#4A7C59]/10 border border-[#4A7C59]/30 rounded-[6px] p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-[#4A7C59]/15 border border-[#4A7C59]/25 text-[#4A7C59] rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h3 className="font-display font-bold text-md uppercase tracking-wider text-[#4A7C59]">🎉 Test Series Completed!</h3>
              <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Excellent work candidate. You have successfully compiled and submitted all mock evaluations.</p>
            </div>
          </div>
        )}

        {/* Tests Unlock List */}
        <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#0D0F12]">Syllabus Sequence</h3>
            <p className="text-[11px] text-[#8B9E6A] font-semibold mt-0.5">Submit each briefing node in sequence to unlock the next evaluation phase.</p>
          </div>

          <div className="divide-y divide-[#DDD8CC]">
            {tests.map((test, index) => {
              const qCount = test._count?.questions || 0;
              const totalMarks = test.marksPerQ * qCount;

              const isCompleted = test.status === "completed";
              const isUnlocked = test.status === "unlocked";
              const isLocked = test.status === "locked";

              return (
                <div
                  key={test.id}
                  className={`relative p-5 sm:p-6 transition-colors ${
                    isLocked ? "bg-gray-50/40" : "bg-white hover:bg-gray-50/30"
                  }`}
                >
                  {/* Left status accent bar */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isCompleted ? "bg-[#4A7C59]" : isUnlocked ? "bg-[#C9A84C]" : "bg-gray-200"
                    }`}
                  />

                  <div className="flex items-start gap-3.5">
                    {/* Numbered status badge */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-sm shadow-sm ${
                        isCompleted
                          ? "bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-[#4A7C59]"
                          : isUnlocked
                          ? "bg-[#C9A84C]/15 border border-[#C9A84C]/35 text-[#C9A84C]"
                          : "bg-gray-100 border border-gray-200 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4.5 h-4.5" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Title + meta */}
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <h4
                        className={`font-display font-bold text-sm uppercase leading-snug ${
                          isLocked ? "text-gray-400" : "text-[#0D0F12]"
                        }`}
                      >
                        {test.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-display font-semibold uppercase tracking-wider">
                        <span className={`px-2 py-0.5 rounded ${isLocked ? "bg-gray-100 text-gray-400" : "bg-[#C9A84C]/10 text-[#C9A84C]"}`}>
                          {formatSubject(test.subject)}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono ${isLocked ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                          <Clock className="w-3 h-3" /> {test.duration}m
                        </span>
                        <span className={`px-2 py-0.5 rounded ${isLocked ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                          {qCount} Qs &bull; {totalMarks.toFixed(0)} Marks
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions row — full width on mobile, inline on desktop */}
                  <div className="mt-4 pl-[3.125rem] sm:pl-[3.125rem]">
                    {isCompleted ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] bg-[#4A7C59]/5 border border-[#4A7C59]/15 px-4 py-2.5">
                        <div className="flex items-baseline gap-1.5 flex-shrink-0">
                          <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-wider">Score</span>
                          <span className="font-mono text-base font-extrabold text-[#4A7C59]">{test.score?.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400 font-medium">/ {totalMarks.toFixed(0)}</span>
                        </div>
                        <Link
                          href={`/student/series/${seriesId}/result/${test.attemptId}`}
                          className="flex-shrink-0 bg-[#C9A84C]/10 border border-[#C9A84C]/25 hover:bg-[#C9A84C]/20 text-[#C9A84C] px-3.5 py-2 rounded text-xs font-display font-bold uppercase tracking-wider transition flex items-center gap-1 shadow-sm whitespace-nowrap"
                        >
                          View Result <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleStartTest(test.id)}
                        disabled={startingTestId !== null}
                        className="w-full sm:w-auto bg-[#C9A84C] hover:bg-[#C9A84C]/90 disabled:bg-[#C9A84C]/65 text-[#0D0F12] px-6 py-3 rounded text-xs font-display font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow"
                      >
                        {test.attemptId ? (
                          <>⏸ {startingTestId === test.id ? "Launching..." : "Resume Test"}</>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" /> {startingTestId === test.id ? "Launching..." : "Start Test"}
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-gray-400 font-display font-bold uppercase tracking-wider text-xs px-4 py-2.5 border border-dashed border-gray-300 bg-gray-50 rounded select-none cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" /> Locked &mdash; Complete previous test
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {tests.length === 0 && (
              <div className="p-12 text-center text-gray-400 font-display">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-bold uppercase tracking-wider">No tests compiled inside this series yet</p>
                <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Coaching admin will deploy mock exams shortly.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
