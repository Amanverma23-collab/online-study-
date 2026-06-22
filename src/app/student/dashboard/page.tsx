"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, LogOut, Radio, Clock, Award, FileText, CheckCircle, ChevronRight, Package, IndianRupee, Play, Lock, Video } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";

interface LiveTest {
  id: string;
  title: string;
  subject: string;
  duration: number;
  totalMarks: number;
  _count: { questions: number };
}

interface Attempt {
  id: string;
  testId: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  rank: number | null;
  test: {
    title: string;
    subject: string;
    totalMarks: number;
    duration: number;
  };
}

interface SeriesTest {
  id: string;
  title: string;
  subject: string;
  order: number;
}

interface TestSeries {
  id: string;
  title: string;
  description: string;
  price: number;
  batch: string[];
  subjects: string[];
  tests: SeriesTest[];
  _count?: { purchases: number };
}

interface Enrollment {
  purchaseId: string;
  purchasedAt: string;
  amount: number;
  series: TestSeries;
}

function StudentDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "tests";

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentBatch, setStudentBatch] = useState("NDA");
  const [liveTests, setLiveTests] = useState<LiveTest[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [availableSeries, setAvailableSeries] = useState<TestSeries[]>([]);
  const [enrolledSeries, setEnrolledSeries] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sId = localStorage.getItem("studentId");
    const sName = localStorage.getItem("studentName");
    const sBatch = localStorage.getItem("studentBatch") || "NDA";
    if (!sId || !sName) {
      router.push("/");
      return;
    }
    setStudentId(sId);
    setStudentName(sName);
    setStudentBatch(sBatch);
    fetchDashboardData(sId, sBatch);

    // FCM Permission request with delay
    const hasAsked = localStorage.getItem("fcm_permission_asked");
    if (!hasAsked) {
      setTimeout(() => {
        import("@/lib/firebase-client")
          .then(({ requestNotificationPermission }) => {
            requestNotificationPermission(sId, "student");
            localStorage.setItem("fcm_permission_asked", "true");
          })
          .catch((err) => {
            console.error("Failed to dynamically import firebase client:", err);
          });
      }, 3000);
    }
  }, []);

  const fetchDashboardData = async (sId: string, sBatch: string) => {
    try {
      const [liveRes, attemptsRes, seriesRes, enrolledRes] = await Promise.all([
        fetch(`/api/tests/live?studentId=${sId}`),
        fetch(`/api/student/${sId}/attempts`),
        fetch(`/api/series/live?studentId=${sId}`),
        fetch(`/api/student/${sId}/purchased-series`)
      ]);

      if (attemptsRes.status === 403) {
        localStorage.removeItem("studentId");
        localStorage.removeItem("studentName");
        localStorage.removeItem("studentMobile");
        localStorage.removeItem("studentBatch");
        alert("Access Denied: This candidate account has been banned.");
        router.push("/");
        return;
      }

      setLiveTests(await liveRes.json());
      setAttempts(await attemptsRes.json());
      setAvailableSeries(await seriesRes.json());
      setEnrolledSeries(await enrolledRes.json());
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId: string) => {
    if (!studentId) return;
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, testId })
      });
      const data = await res.json();
      if (res.ok && data.attempt) {
        router.push(`/student/test/${testId}`);
      } else {
        alert(data.error || "Failed to start test.");
      }
    } catch (err) {
      console.error("Start test failure:", err);
    }
  };

  const getAttemptForTest = (testId: string) => {
    return attempts.find((a) => a.testId === testId);
  };

  const isEnrolled = (seriesId: string) => {
    return enrolledSeries.some((e) => e.series.id === seriesId);
  };

  const nonEnrolledSeries = availableSeries
    .filter((s) => !isEnrolled(s.id))
    .sort((a, b) => {
      const aMatches = a.batch.includes(studentBatch);
      const bMatches = b.batch.includes(studentBatch);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });

  return (
    <main className="flex-1 p-6 md:p-8 pt-14 md:pt-0 overflow-hidden h-full flex flex-col bg-[#F5F3EC]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#F5F3EC] -mx-6 md:-mx-8 px-6 md:px-8 pt-3 md:pt-6 mt-0 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3 border-b border-[#DDD8CC] pb-4 md:pb-6 relative">
        <div>
          <h1 className="page-title text-[#0D0F12] uppercase font-bold !text-[6.6vw] sm:!text-xl md:!text-2xl !tracking-tight sm:!tracking-normal whitespace-nowrap">
            {activeTab === "series" ? "Paid Test Series Pack" : "Briefing Dashboard"}
          </h1>
          <p className="text-sm text-[#8B9E6A] font-body mt-1">
            {activeTab === "series"
              ? "Purchase test bundles and practice premium evaluations"
              : "Review live briefings, scheduled mock tests, and evaluation outcomes"}
          </p>
        </div>
        {studentId && (
          <div className="hidden md:block">
            <NotificationBell userType="student" userId={studentId} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-hidden no-scrollbar pb-8 -mx-6 md:-mx-8 px-6 md:px-8">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : activeTab === "series" ? (
        /* PAID TEST SERIES TAB VIEW */
        <div className="space-y-8 pb-8">
          {/* Enrolled Paid Test Series */}
          {enrolledSeries.length > 0 && (
            <section className="flex-shrink-0">
              <div className="flex items-center gap-2.5 border-b border-[#DDD8CC] pb-3 mb-6">
                <Award className="w-5 h-5 text-[#4A7C59]" />
                <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">My Enrolled Test Series</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledSeries.map((enrollment) => {
                  const s = enrollment.series;
                  return (
                    <Link
                      key={enrollment.purchaseId}
                      href={`/student/series/${s.id}/tests`}
                      className="bg-white rounded-[6px] border border-[#DDD8CC] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between hover:border-[#4A7C59]/50 cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="bg-[#4A7C59]/10 border border-[#4A7C59]/20 text-[#4A7C59] px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                            Enrolled &bull; {s.tests.length} Tests
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-md text-[#0D0F12] mb-2 uppercase group-hover:text-[#4A7C59] transition">
                          {s.title}
                        </h3>
                        <p className="text-xs text-[#8B9E6A] font-semibold mb-4 line-clamp-2">{s.description}</p>
                        
                        {/* Subjects chips */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {s.subjects.map((sub) => (
                            <span key={sub} className="bg-gray-150 text-gray-700 px-2 py-0.5 rounded text-[9px] font-display font-bold uppercase">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="w-full bg-[#4A7C59] text-white font-display font-bold uppercase tracking-wider text-xs py-2.5 rounded transition flex items-center justify-center gap-2 group-hover:bg-[#4A7C59]/90">
                        <Play className="w-3.5 h-3.5 fill-current" /> Continue Test Series &rarr;
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available Test Series for Purchase */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2.5 border-b border-[#DDD8CC] pb-3 mb-6">
              <Package className="w-5 h-5 text-[#C9A84C]" />
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Available Test Series Packs</h2>
            </div>
            {nonEnrolledSeries.length === 0 ? (
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-display font-semibold uppercase tracking-wider text-[#0D0F12]">No new test series packs available</p>
                <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Check back later for new premium releases.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nonEnrolledSeries.map((series) => (
                  <Link
                    key={series.id}
                    href={`/student/series/${series.id}`}
                    className="bg-white rounded-[6px] border border-[#DDD8CC] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between hover:border-[#C9A84C]/50 cursor-pointer group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                          {series.tests.length} {series.tests.length === 1 ? "Test" : "Tests"}
                        </span>
                        <span className="text-[#C9A84C] font-display font-bold text-xl">₹{series.price}</span>
                      </div>
                      <h3 className="font-display font-bold text-md text-[#0D0F12] mb-2 uppercase group-hover:text-[#C9A84C] transition">
                        {series.title}
                      </h3>
                      <p className="text-xs text-[#8B9E6A] font-semibold mb-4 line-clamp-2">{series.description}</p>
                      
                      {/* Subjects & Batches badges */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {series.batch.map((b) => (
                          <span key={b} className="bg-gray-150 text-gray-700 px-2 py-0.5 rounded text-[9px] font-display font-bold uppercase">
                            {b}
                          </span>
                        ))}
                        {series.subjects.map((sub) => (
                          <span key={sub} className="bg-[#C9A84C]/5 text-[#C9A84C] px-2 py-0.5 rounded text-[9px] font-display font-bold uppercase border border-[#C9A84C]/10">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="w-full bg-[#C9A84C] group-hover:bg-[#C9A84C]/95 text-[#0D0F12] font-display font-bold uppercase tracking-wider text-xs py-2.5 rounded transition flex items-center justify-center gap-2">
                      <IndianRupee className="w-3.5 h-3.5" /> Buy Now
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* TESTS & ATTEMPTS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 flex-1 min-h-0">
          {/* Left Column: Free/Live Tests */}
          <div className="lg:col-span-2 flex flex-col lg:h-full lg:min-h-0 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#DDD8CC] pt-3 pb-3 flex-shrink-0">
              <Radio className="w-5 h-5 text-[#C9A84C]" />
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Live Briefings & Exams</h2>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-4 pr-1">
              {liveTests.length === 0 ? (
                <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-[#0D0F12]">No live tests scheduled</p>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Please await briefing deployments from coaching admin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {liveTests.map((test) => {
                    const pastAttempt = getAttemptForTest(test.id);
                    return (
                      <div key={test.id} className="bg-white rounded-[6px] border border-[#DDD8CC] p-6 shadow-sm hover:shadow-md transition duration-150 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">{test.subject}</span>
                            <span className="text-xs text-[#8B9E6A] flex items-center gap-1 font-mono font-semibold"><Clock className="w-3.5 h-3.5 text-[#8B9E6A]" /> {test.duration} MINS</span>
                          </div>
                          <h3 className="font-display font-bold text-md text-[#0D0F12] mb-2 uppercase">{test.title}</h3>
                          <p className="text-xs text-[#8B9E6A] font-semibold font-display mb-4">
                            Questions: <span className="text-[#0D0F12]">{test._count.questions}</span> &bull; Total Marks: <span className="text-[#0D0F12]">{test.totalMarks.toFixed(2)}</span>
                          </p>
                        </div>
                        {pastAttempt ? (
                          pastAttempt.submittedAt ? (
                            <div className="flex flex-col gap-2">
                              <div className="text-xs font-display font-semibold text-[#8B9E6A] flex justify-between items-center bg-[#F5F3EC] px-3 py-1.5 rounded flex-wrap gap-2">
                                <span>SCORE: <span className="font-mono text-[#C9A84C] font-semibold">{pastAttempt.score?.toFixed(2) ?? "0.00"} / {test.totalMarks.toFixed(2)}</span></span>
                                <span>RANK: <span className="font-mono text-navy font-semibold">{pastAttempt.rank ?? "-"}</span></span>
                              </div>
                              <Link href={`/student/result/${pastAttempt.id}`} className="w-full btn-secondary text-center font-bold font-display tracking-widest text-[11px] py-2 uppercase whitespace-nowrap flex-shrink-0">
                                View Result
                              </Link>
                            </div>
                          ) : (
                            <button onClick={() => handleStartTest(test.id)} className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/95 text-[#0D0F12] font-bold font-display tracking-widest text-xs py-2.5 uppercase rounded-sm transition flex items-center justify-center gap-1.5 shadow-sm">
                              ⏸ RESUME TEST
                            </button>
                          )
                        ) : (
                          <button onClick={() => handleStartTest(test.id)} className="w-full btn-primary font-bold font-display tracking-widest text-xs py-2 uppercase">
                            ▶ START TEST
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Attempts */}
          <div className="flex flex-col lg:h-full lg:min-h-0 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[#DDD8CC] pt-3 pb-3 flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-[#0D0F12]" />
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">My Attempts</h2>
            </div>
            <div className="flex-1 bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-6 overflow-y-auto no-scrollbar">
              {attempts.length === 0 ? (
                <div className="text-center text-gray-450 py-8 font-display uppercase tracking-wider text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No test attempts found</p>
                </div>
              ) : (
                <div className="divide-y divide-[#DDD8CC] pr-1">
                  {attempts.map((att) => (
                    <div key={att.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center gap-4 hover:bg-gray-50/50 px-2 rounded transition">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="font-display font-bold text-sm text-[#0D0F12] leading-tight truncate uppercase">{att.test.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold font-display text-[#8B9E6A]">
                          <span>Score: <span className="font-mono text-[#C9A84C] font-bold">{att.score?.toFixed(2) ?? "0.00"}</span></span>
                          <span>&bull;</span>
                          <span>Rank: <span className="font-mono text-navy font-bold">{att.rank ?? "-"}</span></span>
                        </div>
                      </div>
                      <Link href={`/student/result/${att.id}`} className="p-1 rounded bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition flex-shrink-0" title="View Briefing Analysis">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#F5F3EC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  );
}
