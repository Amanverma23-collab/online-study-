"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Award, CheckCircle2, Percent, Users2, ChevronUp, ChevronDown, Check, X, ShieldAlert, ArrowLeft, User } from "lucide-react";
import Link from "next/link";

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

export default function SeriesResultAnalysisPage({ params }: { params: { seriesId: string; attemptId: string } }) {
  const { seriesId, attemptId } = params;
  const router = useRouter();

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All"); // "All" | "Correct" | "Incorrect" | "Unattempted"

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/series-attempts/${attemptId}/result`);
      if (res.ok) {
        const resultData = await res.json();
        setData(resultData);
        if (resultData.questions && resultData.questions.length > 0) {
          setActiveQuestionId(resultData.questions[0].id);
        }
      } else {
        alert("Failed to load series attempt result.");
        router.push(`/student/series/${seriesId}/tests`);
      }
    } catch (err) {
      console.error("Error loading result analysis:", err);
      router.push(`/student/series/${seriesId}/tests`);
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
  const uniqueSubjects = Array.from(new Set(data.questions.map(q => q.subject)));

  // Filter questions based on filters
  const filteredQuestions = data.questions.filter(q => {
    const matchesSubject = subjectFilter === "All" || q.subject === subjectFilter;
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
    <div className="h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12] flex flex-col justify-between font-body">
      {/* 1. TOP HEADER BAR */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#DDD8CC] px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/student/series/${seriesId}/tests`}
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
            href={`/student/series/${seriesId}/tests`}
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
                  const isTotal = row.subject === "Total";
                  return (
                    <tr key={row.subject} className={isTotal ? "bg-[#F5F3EC] font-bold" : "bg-white hover:bg-gray-50/50"}>
                      <td className="px-6 py-4 uppercase font-display tracking-wider text-xs">{row.subject}</td>
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
                          Section: {q.subject}
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
  );
}
