"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Lock, Unlock, CheckCircle, ChevronRight, Play, Star, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";

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
          <Link href={`/student/series/${seriesId}`} className="p-1 border border-[#2E3B1E] bg-[#1C2415] rounded hover:bg-[#2E3B1E] transition">
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
                  className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isLocked ? "bg-gray-50/50 text-gray-400" : "bg-white text-[#0D0F12] hover:bg-gray-50/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon Indicator */}
                    <div className="mt-1 flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-[#4A7C59] fill-[#4A7C59]/10" />
                      ) : isUnlocked ? (
                        <Unlock className="w-5 h-5 text-[#C9A84C]" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-300" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-extrabold text-sm text-[#8B9E6A]">
                          {index + 1}.
                        </span>
                        <h4 className={`font-display font-bold text-sm uppercase ${isLocked ? "text-gray-400" : "text-[#0D0F12]"}`}>
                          {test.title}
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-display font-semibold uppercase tracking-wider text-[#8B9E6A]">
                        <span className="bg-gray-150 px-2 py-0.5 rounded text-[9px]">{test.subject}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-0.5 font-mono"><Clock className="w-3 h-3 text-[#8B9E6A]" /> {test.duration} mins</span>
                        <span>&bull;</span>
                        <span>{qCount} Qs &bull; {totalMarks.toFixed(0)} Marks</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="self-end sm:self-auto flex-shrink-0">
                    {isCompleted ? (
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase">My Evaluation</span>
                          <p className="font-mono text-xs font-extrabold text-[#C9A84C] mt-0.5">
                            {test.score?.toFixed(2)} <span className="text-[10px] text-gray-400 font-medium font-body">/ {totalMarks.toFixed(0)}</span>
                          </p>
                        </div>
                        <Link
                          href={`/student/series/${seriesId}/result/${test.attemptId}`}
                          className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 hover:bg-[#C9A84C]/20 text-[#C9A84C] px-4 py-2 rounded text-xs font-display font-bold uppercase tracking-wider transition flex items-center gap-1 shadow-sm"
                        >
                          View Result <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleStartTest(test.id)}
                        disabled={startingTestId !== null}
                        className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 disabled:bg-[#C9A84C]/65 text-[#0D0F12] px-5 py-2.5 rounded text-xs font-display font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> {startingTestId === test.id ? "Launching..." : "Start Test"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-300 font-display font-bold uppercase tracking-wider text-xs px-4 py-2 border border-dashed border-gray-250 bg-gray-50 rounded select-none cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5 text-gray-300" /> Locked
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
