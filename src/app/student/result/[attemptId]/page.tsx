"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Award, CheckCircle2, Percent, Users2, ChevronUp, ChevronDown, Check, X, ShieldAlert, ArrowLeft, User, BookOpen, Clock, MapPin, List, ChevronRight } from "lucide-react";
import Link from "next/link";

const formatSubject = (sub: string) => {
  if (!sub) return "";
  const trimSub = sub.trim();
  const lower = trimSub.toLowerCase();
  if (lower === "general knowledge") return "GK";
  if (lower === "mathematics") return "Maths";
  return trimSub;
};

interface StatRow {
  score: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  timeSpent: number; // seconds
}

interface LeaderboardUser {
  rank: number;
  name: string;
  score: number;
}

interface QuestionReview {
  id: string;
  order: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  selectedOption: string | null;
  explanation: string | null;
  subject: string;
  sectionId: string;
}

interface SubjectBreakdownRow {
  subject: string;
  score: string;
  correct: number;
  wrong: number;
  unattempted: number;
  accuracy: number;
  timeTaken: string;
}

interface ResultData {
  testId: string;
  testTitle: string;
  duration: number;
  totalMarks: number;
  cutoffMarks: number | null;
  studentName: string;
  you: StatRow & { rank: number; percentile: number; unattempted: number; totalTakers?: number };
  topper: StatRow & { studentName: string };
  avg: StatRow;
  topRankers: LeaderboardUser[];
  questions: QuestionReview[];
  subjectBreakdown: SubjectBreakdownRow[];
}

export default function ResultAnalysisPage({ params }: { params: { attemptId: string } }) {
  const attemptId = params.attemptId;
  const router = useRouter();

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Correct" | "Incorrect" | "Unattempted"

  // Mobile layout state
  const [mobileTab, setMobileTab] = useState<"analysis" | "solutions" | "leaderboard">("analysis");
  const [showSectionsDrawer, setShowSectionsDrawer] = useState(false);
  const [showQuestionReviewDrawer, setShowQuestionReviewDrawer] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/result`);
      if (res.ok) {
        const resultData = await res.json();
        setData(resultData);
        if (resultData.questions && resultData.questions.length > 0) {
          setActiveQuestionId(resultData.questions[0].id);
        }
      } else {
        alert("Failed to load attempt result.");
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error("Error loading result analysis:", err);
      router.push("/student/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EC] text-[#D94F3D]">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
        <p>Result data not available.</p>
      </div>
    );
  }

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalQuestions = data.questions.length;
  const attemptedCount = totalQuestions - data.you.unattempted;

  const cutoff = data.cutoffMarks || (data.totalMarks * 0.45); 
  const cutoffGap = data.you.score - cutoff;
  const aboveCutoff = cutoffGap >= 0;

  // Extract unique subjects for subject filters
  const uniqueSubjects = Array.from(new Set(data.questions.map(q => formatSubject(q.subject))));

  // Filter questions based on filters
  const filteredQuestions = data.questions.filter(q => {
    const matchesSubject = subjectFilter === "All" || formatSubject(q.subject) === subjectFilter;
    const isCorrect = q.selectedOption === q.correctOption;
    const isUnanswered = q.selectedOption === null;

    if (!matchesSubject) return false;

    if (statusFilter === "Correct") {
      return isCorrect && q.selectedOption !== null;
    } else if (statusFilter === "Incorrect") {
      return !isCorrect && q.selectedOption !== null;
    } else if (statusFilter === "Unattempted") {
      return isUnanswered;
    }
    return true;
  });

  const activeQuestion = data.questions.find(q => q.id === activeQuestionId) || filteredQuestions[0] || data.questions[0];

  return (
    <>
      {/* DESKTOP VIEWPORT (hidden md:flex flex-col) */}
      <div className="hidden md:flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12] flex-col justify-between font-body w-full">
        {/* 1. TOP HEADER BAR */}
        <header className="sticky top-0 z-50 bg-white border-b border-[#DDD8CC] px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="p-1.5 border border-[#DDD8CC] rounded-sm hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">{data.testTitle}</h1>
              <p className="text-xs text-[#8B9E6A] font-semibold">Candidate: {data.studentName} &bull; Score & Percentile analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/dashboard"
              className="btn-primary py-2 px-5 text-xs font-bold"
            >
              Go to Tests
            </Link>
          </div>
        </header>

        {/* Main dashboard content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8 overflow-y-auto no-scrollbar">
          {/* SECTION 1 - OVERALL PERFORMANCE SUMMARY */}
          <section className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#0D0F12] border-b border-[#DDD8CC] pb-3 mb-8">Overall Performance Summary</h2>

            {/* Badges row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 justify-center text-center">
              {/* Rank */}
              <div className="flex flex-col items-center">
                <div className="w-[64px] h-[64px] rounded-full bg-[#8B4A6E] text-white flex items-center justify-center mb-3 shadow">
                  <Trophy className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Rank</span>
                <span className="font-display font-bold text-[22px] text-[#0D0F12] mt-1">
                  {data.you.rank} <span className="text-xs text-gray-400 font-medium font-body">/ {data.you.totalTakers || data.topRankers.length}</span>
                </span>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center">
                <div className="w-[64px] h-[64px] rounded-full bg-[#C9A84C] text-[#0D0F12] flex items-center justify-center mb-3 shadow">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Score</span>
                <span className="font-display font-bold text-[22px] text-[#0D0F12] mt-1 font-mono">
                  {data.you.score.toFixed(2)} <span className="text-xs text-gray-400 font-medium font-body">/ {data.totalMarks.toFixed(2)}</span>
                </span>
              </div>

              {/* Attempted */}
              <div className="flex flex-col items-center">
                <div className="w-[64px] h-[64px] rounded-full bg-[#2C6E8A] text-white flex items-center justify-center mb-3 shadow">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Attempted</span>
                <span className="font-display font-bold text-[22px] text-[#0D0F12] mt-1">
                  {attemptedCount} <span className="text-xs text-gray-400 font-medium font-body">/ {totalQuestions}</span>
                </span>
              </div>

              {/* Accuracy */}
              <div className="flex flex-col items-center">
                <div className="w-[64px] h-[64px] rounded-full bg-[#4A7C59] text-white flex items-center justify-center mb-3 shadow">
                  <Percent className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Accuracy</span>
                <span className="font-display font-bold text-[22px] text-[#0D0F12] mt-1">{data.you.accuracy}%</span>
              </div>

              {/* Percentile */}
              <div className="flex flex-col items-center col-span-2 md:col-span-1">
                <div className="w-[64px] h-[64px] rounded-full bg-[#6B4E8A] text-white flex items-center justify-center mb-3 shadow">
                  <Users2 className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Percentile</span>
                <span className="font-display font-bold text-[22px] text-[#0D0F12] mt-1">{data.you.percentile.toFixed(1)}%</span>
              </div>
            </div>

            {/* Cutoff Gap Indicator */}
            <div className="mt-8 border-t border-[#DDD8CC] pt-5 flex items-center justify-center gap-3">
              {aboveCutoff ? (
                <ChevronUp className="w-7 h-7 text-[#4A7C59] bg-[#4A7C59]/10 rounded-full border border-[#4A7C59]/20" />
              ) : (
                <ChevronDown className="w-7 h-7 text-[#D94F3D] bg-[#D94F3D]/10 rounded-full border border-[#D94F3D]/20" />
              )}
              <span className={`text-sm md:text-md font-bold uppercase font-display tracking-wider ${aboveCutoff ? "text-[#4A7C59]" : "text-[#D94F3D]"}`}>
                {aboveCutoff
                  ? `You scored ${cutoffGap.toFixed(2)} Marks ▲ above cutoff!`
                  : `You scored ${Math.abs(cutoffGap).toFixed(2)} Marks ▼ less than cutoff!`}
              </span>
              <span className="text-xs text-[#8B9E6A] font-display font-bold bg-[#F5F3EC] px-2.5 py-1 border border-[#DDD8CC] rounded-sm uppercase tracking-wider">
                CUTOFF: {cutoff.toFixed(2)} Marks
              </span>
            </div>
          </section>

          {/* SECTION 2 - SUBJECT-WISE BREAKDOWN TABLE */}
          <section className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#0D0F12] border-b border-[#DDD8CC] pb-3 mb-6">Subject-wise Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-[#DDD8CC] border-collapse font-body">
                <thead>
                  <tr className="bg-[#F5F3EC] border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Correct</th>
                    <th className="px-6 py-4">Wrong</th>
                    <th className="px-6 py-4">Unattempted</th>
                    <th className="px-6 py-4">Accuracy</th>
                    <th className="px-6 py-4">Time Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                  {data.subjectBreakdown && data.subjectBreakdown.map((row: any) => {
                    const displaySub = formatSubject(row.subject);
                    const isTotal = displaySub === "Total";
                    return (
                      <tr key={row.subject} className={isTotal ? "bg-[#F5F3EC] font-bold" : "bg-white hover:bg-gray-50/50"}>
                        <td className="px-6 py-4 uppercase font-display tracking-wider text-xs">{displaySub}</td>
                        <td className="px-6 py-4 font-mono">{row.score}</td>
                        <td className="px-6 py-4 font-mono text-[#4A7C59]">{row.correct}</td>
                        <td className="px-6 py-4 font-mono text-[#D94F3D]">{row.wrong}</td>
                        <td className="px-6 py-4 font-mono text-gray-500">{row.unattempted}</td>
                        <td className="px-6 py-4 font-mono">{row.accuracy}%</td>
                        <td className="px-6 py-4 font-mono text-[#2C6E8A]">{row.timeTaken}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 3 - COMPARISON TABLE */}
          <section className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#0D0F12] border-b border-[#DDD8CC] pb-3 mb-6">Comparison Analysis</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border border-[#DDD8CC] border-collapse font-body">
                <thead>
                  <tr className="bg-[#F5F3EC] border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 w-40">Candidate</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Accuracy</th>
                    <th className="px-6 py-4">Correct</th>
                    <th className="px-6 py-4">Wrong</th>
                    <th className="px-6 py-4">Time Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                  {/* 1. You Row */}
                  <tr className="hover:bg-gray-50/50 bg-white">
                    <td className="px-6 py-4 text-[#0D0F12] font-bold">You</td>
                    <td className="px-6 py-4">
                      <span className="text-[#C9A84C] font-bold font-mono">{data.you.score.toFixed(2)}</span> / {data.totalMarks.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono">{data.you.accuracy}%</td>
                    <td className="px-6 py-4">
                      <span className="text-[#4A7C59] font-bold font-mono">{data.you.correct}</span> / {totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#D94F3D] font-bold font-mono">{data.you.incorrect}</span> / {totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#2C6E8A] font-bold font-mono">{formatTime(data.you.timeSpent)}</span> / {data.duration} mins
                    </td>
                  </tr>

                  {/* 2. Topper Row */}
                  <tr className="bg-[#FDF8EC] hover:bg-[#FDF8EC]/90">
                    <td className="px-6 py-4 text-[#0D0F12] font-bold flex flex-col">
                      <span>Topper</span>
                      <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-wider">{data.topper.studentName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#C9A84C] font-bold font-mono">{data.topper.score.toFixed(2)}</span> / {data.totalMarks.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono">{data.topper.accuracy}%</td>
                    <td className="px-6 py-4">
                      <span className="text-[#4A7C59] font-bold font-mono">{data.topper.correct}</span> / {totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#D94F3D] font-bold font-mono">{data.topper.incorrect}</span> / {totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#2C6E8A] font-bold font-mono">{formatTime(data.topper.timeSpent)}</span> / {data.duration} mins
                    </td>
                  </tr>

                  {/* 3. Avg Row */}
                  <tr className="hover:bg-gray-50/50 bg-white">
                    <td className="px-6 py-4 text-[#0D0F12] font-bold">Average</td>
                    <td className="px-6 py-4">
                      <span className="text-[#C9A84C] font-bold font-mono">{data.avg.score.toFixed(2)}</span> / {data.totalMarks.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono">{data.avg.accuracy}%</td>
                    <td className="px-6 py-4">
                      <span className="text-[#4A7C59] font-bold font-mono">{data.avg.correct.toFixed(1)}</span> / {totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#D94F3D] font-bold font-mono">{data.avg.incorrect.toFixed(1)}</span> / {totalQuestions}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#2C6E8A] font-bold font-mono">{formatTime(data.avg.timeSpent)}</span> / {data.duration} mins
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 4 - LEADERS & LEADERBOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8">
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12] border-b border-[#DDD8CC] pb-3 mb-6">Coaching Performance Analysis</h2>
              <p className="text-xs text-gray-500 font-body leading-relaxed mb-4">
                Select questions below for solutions, or analyze subject metrics in the summary table.
              </p>
            </div>

            {/* Top Rankers Leaderboard */}
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="border-b border-[#DDD8CC] pb-3 mb-4">
                  <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12] flex items-center gap-2">
                    <Users2 className="w-5 h-5 text-[#C9A84C]" /> Top Rankers
                  </h2>
                  <p className="text-[11px] text-[#8B9E6A] font-semibold mt-0.5">Leaderboard for this session briefing</p>
                </div>

                <div className="divide-y divide-[#DDD8CC] max-h-[50vh] overflow-y-auto">
                  {data.topRankers.map((user) => (
                    <div key={user.rank} className="py-3.5 flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display font-extrabold text-md text-[#C9A84C] w-5 text-center">
                          {user.rank}.
                        </span>
                        <div className="w-9 h-9 bg-[#2C6E8A] text-white rounded-full flex items-center justify-center shadow-inner">
                          <User className="w-4 h-4 fill-current" />
                        </div>
                        <span className="font-semibold text-[#0D0F12] text-sm font-body">{user.name}</span>
                      </div>
                      <span className="font-bold text-[#8B9E6A] text-xs font-display tracking-wider font-mono">{user.score.toFixed(2)} Marks</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t border-[#DDD8CC] text-center text-[10px] text-[#8B9E6A]/50 uppercase tracking-widest font-display">
                Coaching Rank list &copy; 2026.
              </div>
            </div>
          </div>

          {/* SECTION 5 - QUESTION-WISE REVIEW WITH SUBJECT FILTER */}
          <section id="question-wise-review" className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8">
            <div className="border-b border-[#DDD8CC] pb-4 mb-6">
              <h2 className="font-display font-bold text-xl uppercase tracking-wider text-[#0D0F12]">Solution Briefing & Review</h2>
              
              {/* Subject Tabs */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => { setSubjectFilter("All"); }}
                  className={`px-4 py-1.5 rounded-sm font-display text-xs font-bold uppercase tracking-wider border transition ${
                    subjectFilter === "All"
                      ? "bg-[#C9A84C] text-[#0D0F12] border-[#C9A84C]"
                      : "bg-[#F5F3EC] text-[#8B9E6A] border-[#DDD8CC] hover:bg-gray-150"
                  }`}
                >
                  All Subjects
                </button>
                {uniqueSubjects.map(sub => (
                  <button
                    key={sub}
                    onClick={() => { setSubjectFilter(sub); }}
                    className={`px-4 py-1.5 rounded-sm font-display text-xs font-bold uppercase tracking-wider border transition ${
                      subjectFilter === sub
                        ? "bg-[#C9A84C] text-[#0D0F12] border-[#C9A84C]"
                        : "bg-[#F5F3EC] text-[#8B9E6A] border-[#DDD8CC] hover:bg-gray-150"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Correct/Incorrect Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { label: "View All", value: "All" },
                  { label: "View Correct", value: "Correct" },
                  { label: "View Incorrect", value: "Incorrect" },
                  { label: "View Unattempted", value: "Unattempted" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); }}
                    className={`px-3 py-1 rounded text-[10.5px] font-display font-bold uppercase tracking-wider border transition ${
                      statusFilter === opt.value
                        ? "bg-[#2E3B1E] text-[#C9A84C] border-[#C9A84C]"
                        : "bg-white text-gray-500 border-[#DDD8CC] hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid selection buttons */}
            <div className="flex flex-wrap gap-2.5 justify-start mb-8">
              {filteredQuestions.length === 0 ? (
                <p className="text-xs text-gray-400 font-semibold font-body py-4">No questions match the active filters.</p>
              ) : (
                filteredQuestions.map((q) => {
                  const isSelected = q.id === activeQuestionId;
                  const isUnans = q.selectedOption === null;
                  const isCorr = q.selectedOption === q.correctOption;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionId(q.id)}
                      className={`w-9 h-9 rounded-sm flex items-center justify-center text-xs font-bold transition relative border-2 ${
                        isSelected
                          ? "ring-2 ring-[#C9A84C] ring-offset-1"
                          : ""
                      } ${
                        isUnans
                          ? "bg-[#EEF0E8] text-[#8B9E6A] border-[#8B9E6A]/30 hover:bg-gray-150"
                          : isCorr
                          ? "bg-[#4A7C59] text-[#EEF0E8] border-[#4A7C59] hover:bg-[#4A7C59]/90"
                          : "bg-[#D94F3D] text-[#EEF0E8] border-[#D94F3D] hover:bg-[#D94F3D]/90"
                      }`}
                    >
                      {q.order}
                    </button>
                  );
                })
              )}
            </div>

            {/* Active Question Panel */}
            {activeQuestion && (
              <div className="bg-white p-6 border border-[#DDD8CC] rounded-[6px] max-w-4xl mx-auto shadow-sm">
                {(() => {
                  const q = activeQuestion;
                  const isUnans = q.selectedOption === null;
                  const isCorr = q.selectedOption === q.correctOption;

                  return (
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-[#DDD8CC] pb-4 mb-4 gap-4">
                        <div>
                          <h3 className="font-display font-bold text-md text-[#0D0F12] flex items-start gap-2.5 leading-relaxed">
                            <span className="bg-[#0D0F12] text-[#EEF0E8] px-2 py-0.5 rounded-sm text-xs mt-1 font-mono font-bold">{q.order}</span>
                            <span className="question-text text-[#0D0F12] leading-relaxed">{q.questionText}</span>
                          </h3>
                          <span className="text-[10px] bg-gray-100 text-gray-400 font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-2 inline-block">
                            Section: {formatSubject(q.subject)}
                          </span>
                        </div>
                        <div>
                          {isUnans ? (
                            <span className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded text-xs font-display font-bold uppercase tracking-wider">
                              Unattempted
                            </span>
                          ) : isCorr ? (
                            <span className="bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 px-3 py-1 rounded text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Correct
                            </span>
                          ) : (
                            <span className="bg-[#D94F3D]/10 text-[#D94F3D] border border-[#D94F3D]/20 px-3 py-1 rounded text-xs font-display font-bold uppercase tracking-wider flex items-center gap-1">
                              <X className="w-3.5 h-3.5" /> Incorrect
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Options list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {(["A", "B", "C", "D"] as const).map((opt) => {
                          const optText = q[`option${opt}`] as string;
                          const isCorrectOpt = q.correctOption === opt;
                          const isSelectedOpt = q.selectedOption === opt;

                          return (
                            <div
                              key={opt}
                              className={`flex items-start text-left gap-3 p-4 rounded border-2 text-xs font-medium font-body leading-relaxed ${
                                isCorrectOpt
                                  ? "bg-[#4A7C59]/10 border-[#4A7C59] text-[#4A7C59] font-bold"
                                  : isSelectedOpt
                                  ? "bg-[#D94F3D]/10 border-[#D94F3D] text-[#D94F3D] font-bold"
                                  : "bg-white border-[#DDD8CC] text-gray-700"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 mt-0.5 ${
                                  isCorrectOpt
                                    ? "bg-[#4A7C59] text-white"
                                    : isSelectedOpt
                                    ? "bg-[#D94F3D] text-white"
                                    : "border border-gray-400 text-gray-500 bg-[#F5F3EC]"
                                }`}
                              >
                                {opt}
                              </span>
                              <span>{optText}</span>
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-6 p-4 bg-[#F5F3EC] border border-[#DDD8CC] rounded-[6px]">
                          <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[#C9A84C] mb-1.5">Explanation</h4>
                          <p className="text-xs text-gray-700 font-body leading-relaxed whitespace-pre-line">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* MOBILE VIEWPORT (flex md:hidden flex-col) */}
      <div className="flex md:hidden h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12] flex-col font-body w-full select-none relative">
        {/* 1. TOP HEADER */}
        <header className="bg-white border-b border-[#DDD8CC] px-4 py-3 flex justify-between items-center h-14 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href="/student/dashboard"
              className="p-1 hover:bg-gray-100 rounded transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <div>
              <h1 className="font-display font-bold text-sm uppercase tracking-wide text-[#0D0F12] max-w-[180px] truncate">
                {data.testTitle}
              </h1>
              <p className="text-[10px] text-[#8B9E6A] font-bold uppercase tracking-wider leading-none mt-0.5">
                Result Analysis
              </p>
            </div>
          </div>
          <Link
            href="/student/dashboard"
            className="btn-primary text-[10px] py-1.5 px-3 font-bold"
          >
            Exit
          </Link>
        </header>

        {/* 2. TAB SUB-NAVIGATION */}
        <div className="bg-white border-b border-[#DDD8CC] h-11 flex-shrink-0 flex items-center justify-around shadow-sm">
          {(["analysis", "solutions", "leaderboard"] as const).map((tab) => {
            const isActive = mobileTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 h-full font-display text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center justify-center ${
                  isActive
                    ? "border-b-2 border-[#C9A84C] text-[#C9A84C] font-extrabold"
                    : "border-transparent text-gray-500 hover:text-gray-750"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* 3. SCROLLABLE TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 no-scrollbar">
          {mobileTab === "analysis" && (
            <div className="space-y-3.5">
              {/* Rank Card */}
              <div className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#8B4A6E]/10 border border-[#8B4A6E]/20 text-[#8B4A6E] flex items-center justify-center shadow-sm flex-shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] leading-none">Your Rank</h3>
                    <p className="font-display font-bold text-lg text-[#0D0F12] mt-1 leading-none">
                      {data.you.rank} <span className="text-xs text-gray-400 font-medium font-body">/ {data.you.totalTakers || data.topRankers.length}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-semibold font-body block leading-none">Topper Score</span>
                  <span className="font-display font-bold text-sm text-[#8B4A6E] mt-1 block leading-none font-mono">{data.topper.score.toFixed(2)}</span>
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] flex items-center justify-center shadow-sm flex-shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] leading-none">Your Score</h3>
                    <p className="font-display font-bold text-lg text-[#0D0F12] mt-1 leading-none font-mono">
                      {data.you.score.toFixed(2)} <span className="text-xs text-gray-400 font-medium font-body">/ {data.totalMarks.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-semibold font-body block leading-none">Best / Avg</span>
                  <span className="text-xs font-bold text-gray-700 font-mono block mt-1 leading-none">
                    {data.topper.score.toFixed(1)} / {data.avg.score.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Cutoff Status Card */}
              <div className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border ${
                    aboveCutoff 
                      ? "bg-[#4A7C59]/10 border-[#4A7C59]/20 text-[#4A7C59]" 
                      : "bg-[#D94F3D]/10 border-[#D94F3D]/20 text-[#D94F3D]"
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] leading-none">Cutoff Status</h3>
                    <p className={`font-display font-extrabold text-sm uppercase tracking-wider mt-1 leading-none ${aboveCutoff ? "text-[#4A7C59]" : "text-[#D94F3D]"}`}>
                      {aboveCutoff ? "PASSED" : "FAILED"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-semibold font-body block leading-none">Cutoff Marks</span>
                  <span className="text-xs font-bold text-gray-700 font-mono block mt-1 leading-none">
                    {cutoff.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Percentile Card */}
              <div className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#6B4E8A]/10 border border-[#6B4E8A]/20 text-[#6B4E8A] flex items-center justify-center shadow-sm flex-shrink-0">
                    <Users2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] leading-none">Percentile</h3>
                    <p className="font-display font-bold text-lg text-[#0D0F12] mt-1 leading-none font-mono">
                      {data.you.percentile.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-semibold font-body block leading-none">Topper</span>
                  <span className="text-xs font-bold text-[#6B4E8A] font-mono block mt-1 leading-none">100%</span>
                </div>
              </div>

              {/* Accuracy Card */}
              <div className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#4A7C59]/10 border border-[#4A7C59]/20 text-[#4A7C59] flex items-center justify-center shadow-sm flex-shrink-0">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] leading-none">Accuracy</h3>
                    <p className="font-display font-bold text-lg text-[#0D0F12] mt-1 leading-none font-mono">
                      {data.you.accuracy}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 font-semibold font-body block leading-none">Avg Accuracy</span>
                  <span className="text-xs font-bold text-[#4A7C59] font-mono block mt-1 leading-none">
                    {data.avg.accuracy}%
                  </span>
                </div>
              </div>

              {/* Attempted Card */}
              <div className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#2C6E8A]/10 border border-[#2C6E8A]/20 text-[#2C6E8A] flex items-center justify-center shadow-sm flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] leading-none">Attempted</h3>
                      <p className="font-display font-bold text-lg text-[#0D0F12] mt-1 leading-none">
                        {attemptedCount} <span className="text-xs text-gray-400 font-medium font-body">/ {totalQuestions}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 font-semibold font-body block leading-none">Accuracy</span>
                    <span className="text-xs font-bold text-[#2C6E8A] font-mono block mt-1 leading-none">{data.you.accuracy}%</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-150 pt-2 text-[10px] font-semibold text-gray-600">
                  <span className="bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/25 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]"></span>
                    {data.you.correct} Correct
                  </span>
                  <span className="bg-[#D94F3D]/10 text-[#D94F3D] border border-[#D94F3D]/25 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D94F3D]"></span>
                    {data.you.incorrect} Wrong
                  </span>
                  <span className="bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    {data.you.unattempted} Left
                  </span>
                </div>
              </div>
            </div>
          )}

          {mobileTab === "solutions" && (
            <div className="space-y-4">
              {/* Horizontal Filters Scroll */}
              <div className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar pb-1">
                {[
                  { label: "All Questions", value: "All" },
                  { label: "Correct", value: "Correct" },
                  { label: "Incorrect", value: "Incorrect" },
                  { label: "Unattempted", value: "Unattempted" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); }}
                    className={`px-3.5 py-1.5 rounded border text-[11px] font-display font-bold uppercase tracking-wider transition ${
                      statusFilter === opt.value
                        ? "bg-[#2E3B1E] text-[#C9A84C] border-[#C9A84C]"
                        : "bg-white text-gray-500 border-[#DDD8CC] hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Solutions cards list */}
              <div className="space-y-3">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs font-semibold">
                    No questions match the active filters.
                  </div>
                ) : (
                  filteredQuestions.map((q) => {
                    const isUnans = q.selectedOption === null;
                    const isCorr = q.selectedOption === q.correctOption;

                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setActiveQuestionId(q.id);
                          setShowQuestionReviewDrawer(true);
                        }}
                        className="bg-white p-4 rounded border border-[#DDD8CC] shadow-sm hover:border-[#C9A84C] transition flex flex-col gap-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                              isUnans
                                ? "bg-[#EEF0E8] text-[#8B9E6A]"
                                : isCorr
                                ? "bg-[#4A7C59] text-white"
                                : "bg-[#D94F3D] text-white"
                            }`}>
                              {q.order}
                            </span>
                            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A]">
                              {formatSubject(q.subject)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-700 leading-relaxed truncate font-medium font-body">
                          {q.questionText}
                        </p>
                        
                        <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-[10px] font-display font-bold text-[#C9A84C] uppercase tracking-wider">
                          <span>View Answer Key &amp; Explanation</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sections Floating Action Button */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
                <button
                  onClick={() => setShowSectionsDrawer(true)}
                  className="bg-[#2E3B1E] border border-[#C9A84C] text-[#C9A84C] shadow-lg rounded-full px-5 py-2.5 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest hover:bg-[#3d4f29] transition active:scale-95"
                >
                  <List className="w-4 h-4" />
                  <span>Sections</span>
                </button>
              </div>
            </div>
          )}

          {mobileTab === "leaderboard" && (
            <div className="space-y-4">
              {/* Leaderboard Podium */}
              {(() => {
                const first = data.topRankers[0];
                const second = data.topRankers[1];
                const third = data.topRankers[2];
                
                return (
                  <div className="bg-white p-5 rounded border border-[#DDD8CC] shadow-sm">
                    {/* Reattempt Test Banner */}
                    <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded p-3 mb-6 flex justify-between items-center gap-3">
                      <div className="flex-1">
                        <h4 className="text-xs font-display font-bold uppercase text-[#0D0F12] tracking-wide leading-tight">Improve your Rank?</h4>
                        <p className="text-[9px] text-gray-500 font-semibold font-body mt-0.5">Reattempt the exam to practice and score better!</p>
                      </div>
                      <Link
                        href={`/student/test/${data.testId}`}
                        className="bg-[#C9A84C] text-[#0D0F12] font-display text-[9px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-sm hover:bg-[#b0923e] transition flex-shrink-0"
                      >
                        Reattempt
                      </Link>
                    </div>

                    <h3 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#8B9E6A] border-b border-[#DDD8CC] pb-2 mb-6 text-center">
                      Leaderboard Standings
                    </h3>

                    {/* Podium Row */}
                    <div className="flex items-end justify-center gap-2.5 mt-2 mb-1">
                      {/* Second Place */}
                      {second && (
                        <div className="flex flex-col items-center flex-1 max-w-[90px]">
                          <div className="w-9 h-9 rounded-full bg-gray-150 border-2 border-gray-300 flex items-center justify-center font-display font-extrabold text-xs text-gray-500 relative mb-1 shadow-sm">
                            {second.name.charAt(0)}
                            <span className="absolute -top-1 -right-1 bg-gray-400 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[7.5px] border border-white font-bold">2</span>
                          </div>
                          <span className="text-[9px] font-bold text-[#0D0F12] font-body truncate w-full text-center leading-none">{second.name}</span>
                          <span className="text-[8px] font-mono text-[#8B9E6A] font-bold mt-1">{second.score.toFixed(1)}m</span>
                          
                          {/* Step */}
                          <div className="w-full bg-gray-100 border border-gray-200 rounded-t h-10 flex items-center justify-center mt-1.5">
                            <span className="font-display font-extrabold text-[#DDD8CC] text-md">2</span>
                          </div>
                        </div>
                      )}

                      {/* First Place */}
                      {first && (
                        <div className="flex flex-col items-center flex-1 max-w-[100px] -translate-y-2">
                          <div className="w-11 h-11 rounded-full bg-[#C9A84C]/20 border-2 border-[#C9A84C] flex items-center justify-center font-display font-extrabold text-sm text-[#C9A84C] relative mb-1 shadow-md">
                            {first.name.charAt(0)}
                            <span className="absolute -top-1.5 -right-1.5 bg-[#C9A84C] text-[#0D0F12] w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] border border-white font-extrabold">1</span>
                          </div>
                          <span className="text-[9px] font-extrabold text-[#0D0F12] font-body truncate w-full text-center leading-none">{first.name}</span>
                          <span className="text-[8px] font-mono text-[#C9A84C] font-extrabold mt-1">{first.score.toFixed(1)}m</span>
                          
                          {/* Step */}
                          <div className="w-full bg-[#2E3B1E] border border-[#C9A84C]/50 rounded-t h-14 flex items-center justify-center mt-1.5 shadow-inner">
                            <span className="font-display font-extrabold text-[#C9A84C] text-xl">1</span>
                          </div>
                        </div>
                      )}

                      {/* Third Place */}
                      {third && (
                        <div className="flex flex-col items-center flex-1 max-w-[90px]">
                          <div className="w-9 h-9 rounded-full bg-[#8B9E6A]/20 border-2 border-[#8B9E6A]/30 flex items-center justify-center font-display font-extrabold text-xs text-[#8B9E6A] relative mb-1 shadow-sm">
                            {third.name.charAt(0)}
                            <span className="absolute -top-1 -right-1 bg-[#8B9E6A] text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[7.5px] border border-white font-bold">3</span>
                          </div>
                          <span className="text-[9px] font-bold text-[#0D0F12] font-body truncate w-full text-center leading-none">{third.name}</span>
                          <span className="text-[8px] font-mono text-[#8B9E6A] font-bold mt-1">{third.score.toFixed(1)}m</span>
                          
                          {/* Step */}
                          <div className="w-full bg-gray-50 border border-gray-200 rounded-t h-8 flex items-center justify-center mt-1.5">
                            <span className="font-display font-extrabold text-[#DDD8CC] text-sm">3</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Ranks list */}
              <div className="bg-white rounded border border-[#DDD8CC] shadow-sm divide-y divide-gray-100 px-4">
                {data.topRankers.slice(3).map((user) => (
                  <div key={user.rank} className="py-2.5 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display font-extrabold text-[11px] text-[#8B9E6A] w-5 text-center">
                        {user.rank}
                      </span>
                      <div className="w-6.5 h-6.5 bg-[#2C6E8A]/10 border border-[#2C6E8A]/20 text-[#2C6E8A] rounded-full flex items-center justify-center font-display font-bold text-[10px] shadow-inner">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-[#0D0F12] text-[11px] font-body">{user.name}</span>
                    </div>
                    <span className="font-bold text-[#8B9E6A] text-[10.5px] font-display tracking-wider font-mono">
                      {user.score.toFixed(1)} m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. CANDIDATE STICKY BAR (Only on leaderboard tab) */}
        {mobileTab === "leaderboard" && (
          <div className="fixed bottom-0 inset-x-0 bg-[#2E3B1E] border-t border-[#C9A84C] px-5 py-3.5 flex justify-between items-center z-40 shadow-2xl h-14 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-display font-extrabold text-sm text-[#C9A84C] w-5 text-center">
                {data.you.rank}
              </span>
              <div className="w-8 h-8 bg-[#C9A84C] text-[#0D0F12] rounded-full flex items-center justify-center font-display font-extrabold text-xs shadow-lg">
                {data.studentName.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold text-white text-xs font-body tracking-wide truncate max-w-[150px]">{data.studentName}</h4>
                <span className="text-[9px] text-[#C9A84C] font-display font-bold uppercase tracking-widest block leading-none mt-0.5">Your Standing</span>
              </div>
            </div>
            <span className="font-bold text-[#C9A84C] text-sm font-display tracking-wider font-mono">
              {data.you.score.toFixed(2)} Marks
            </span>
          </div>
        )}
      </div>

      {/* MOBILE DRAWERS */}
      {/* Sections bottom sheet */}
      {showSectionsDrawer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowSectionsDrawer(false)}
          />
          <div className="bg-white rounded-t-xl w-full max-w-md p-5 z-50 border-t border-[#DDD8CC] relative animate-slide-up">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#0D0F12] mb-3">
              Filter by Section
            </h3>
            
            <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
              <button
                onClick={() => {
                  setSubjectFilter("All");
                  setShowSectionsDrawer(false);
                }}
                className={`w-full text-left p-3 rounded border text-[11px] font-display font-bold uppercase tracking-wider transition ${
                  subjectFilter === "All"
                    ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#0D0F12]"
                    : "bg-white border-[#DDD8CC] text-gray-600 hover:bg-gray-55"
                }`}
              >
                All Subjects
              </button>
              
              {uniqueSubjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => {
                    setSubjectFilter(sub);
                    setShowSectionsDrawer(false);
                  }}
                  className={`w-full text-left p-3 rounded border text-[11px] font-display font-bold uppercase tracking-wider transition ${
                    subjectFilter === sub
                      ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#0D0F12]"
                      : "bg-white border-[#DDD8CC] text-gray-600 hover:bg-gray-55"
                  }`}
                >
                  {formatSubject(sub)}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowSectionsDrawer(false)}
              className="w-full mt-4 py-3 bg-[#EEF0E8] border border-[#DDD8CC] rounded font-display text-[10px] font-bold uppercase tracking-widest text-gray-600 active:scale-95 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Active Question detail slide-up bottom sheet */}
      {showQuestionReviewDrawer && activeQuestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setShowQuestionReviewDrawer(false)}
          />
          <div className="bg-white rounded-t-xl w-full max-w-md p-5 z-55 border-t border-[#DDD8CC] relative max-h-[85vh] overflow-y-auto no-scrollbar flex flex-col justify-between">
            <div>
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 flex-shrink-0" />
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-4 gap-4 flex-shrink-0">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#0D0F12] flex items-start gap-2.5">
                    <span className="bg-[#0D0F12] text-[#EEF0E8] px-2 py-0.5 rounded-sm text-[10px] mt-0.5 font-mono font-bold whitespace-nowrap flex-shrink-0">
                      Q {activeQuestion.order}
                    </span>
                    <span className="text-[10px] bg-gray-100 text-[#8B9E6A] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 inline-block">
                      {formatSubject(activeQuestion.subject)}
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => setShowQuestionReviewDrawer(false)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question Text */}
              <div className="bg-gray-50 border border-gray-100 rounded p-4 mb-4">
                <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap font-body">
                  {activeQuestion.questionText}
                </p>
              </div>

              {/* Status */}
              <div className="mb-4">
                {activeQuestion.selectedOption === null ? (
                  <span className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                    Unattempted
                  </span>
                ) : activeQuestion.selectedOption === activeQuestion.correctOption ? (
                  <span className="bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 px-3 py-1 rounded text-[10px] font-display font-bold uppercase tracking-wider inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Correct
                  </span>
                ) : (
                  <span className="bg-[#D94F3D]/10 text-[#D94F3D] border border-[#D94F3D]/20 px-3 py-1 rounded text-[10px] font-display font-bold uppercase tracking-wider inline-flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> Incorrect
                  </span>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2.5 mb-6">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const optText = activeQuestion[`option${opt}`] as string;
                  const isCorrectOpt = activeQuestion.correctOption === opt;
                  const isSelectedOpt = activeQuestion.selectedOption === opt;

                  return (
                    <div
                      key={opt}
                      className={`flex items-start text-left gap-3 p-3 rounded border-2 text-[11px] font-medium font-body leading-relaxed ${
                        isCorrectOpt
                          ? "bg-[#4A7C59]/10 border-[#4A7C59] text-[#4A7C59] font-bold"
                          : isSelectedOpt
                          ? "bg-[#D94F3D]/10 border-[#D94F3D] text-[#D94F3D] font-bold"
                          : "bg-white border-[#DDD8CC] text-gray-700"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 mt-0.5 ${
                          isCorrectOpt
                            ? "bg-[#4A7C59] text-white"
                            : isSelectedOpt
                            ? "bg-[#D94F3D] text-white"
                            : "border border-gray-400 text-gray-500 bg-[#F5F3EC]"
                        }`}
                      >
                        {opt}
                      </span>
                      <span>{optText}</span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {activeQuestion.explanation && (
                <div className="p-4 bg-[#F5F3EC] border border-[#DDD8CC] rounded-[6px] mb-6">
                  <h4 className="text-[10px] font-display font-bold uppercase tracking-wider text-[#C9A84C] mb-1.5">Explanation</h4>
                  <p className="text-[11px] text-gray-700 font-body leading-relaxed whitespace-pre-line">{activeQuestion.explanation}</p>
                </div>
              )}
            </div>

            {/* Navigation inside Drawer */}
            <div className="flex gap-4 border-t border-gray-150 pt-4 mt-auto flex-shrink-0">
              <button
                onClick={() => {
                  const currentIdx = filteredQuestions.findIndex(q => q.id === activeQuestion.id);
                  if (currentIdx > 0) {
                    setActiveQuestionId(filteredQuestions[currentIdx - 1].id);
                  }
                }}
                disabled={filteredQuestions.findIndex(q => q.id === activeQuestion.id) <= 0}
                className="flex-1 py-2.5 border border-[#DDD8CC] rounded text-[11px] font-display font-bold uppercase tracking-wider text-gray-600 disabled:opacity-30 bg-gray-50 active:scale-95 transition"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  const currentIdx = filteredQuestions.findIndex(q => q.id === activeQuestion.id);
                  if (currentIdx !== -1 && currentIdx < filteredQuestions.length - 1) {
                    setActiveQuestionId(filteredQuestions[currentIdx + 1].id);
                  }
                }}
                disabled={
                  filteredQuestions.findIndex(q => q.id === activeQuestion.id) === -1 || 
                  filteredQuestions.findIndex(q => q.id === activeQuestion.id) >= filteredQuestions.length - 1
                }
                className="flex-1 bg-[#C9A84C] text-[#0D0F12] rounded text-[11px] font-display font-bold uppercase tracking-wider disabled:opacity-30 active:scale-95 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
