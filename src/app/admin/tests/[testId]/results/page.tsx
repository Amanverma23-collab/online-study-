"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { FileDown, Users, Star, Award, Clock, ArrowLeft, Check, X, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface SubjectBreakdown {
  subject: string;
  score: number;
  maxMarks: number;
  correct: number;
  wrong: number;
  unattempted: number;
}

interface ResultRow {
  id: string; // attemptId
  rank: number;
  studentName: string;
  fatherName: string;
  mobile: string;
  score: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
  timeSpent: number; // seconds
  subjectBreakdown: SubjectBreakdown[];
}

interface TestResults {
  testTitle: string;
  totalMarks: number;
  results: ResultRow[];
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
}

export default function TestResultsPage({ params }: { params: { testId: string } }) {
  const testId = params.testId;
  const [data, setData] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [reviewQuestions, setReviewQuestions] = useState<QuestionReview[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Expanded student breakdown
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [testId]);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/admin/tests/${testId}/results`);
      const resultsData = await res.json();
      setData(resultsData);
    } catch (err) {
      console.error("Failed to fetch test results:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (attemptId: string, name: string) => {
    setSelectedAttemptId(attemptId);
    setSelectedStudentName(name);
    setReviewLoading(true);

    try {
      const res = await fetch(`/api/attempts/${attemptId}/result`);
      const resultData = await res.json();
      setReviewQuestions(resultData.questions || []);
    } catch (err) {
      console.error("Failed to fetch attempt answers sheet:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC]">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC]">
        <AdminSidebar />
        <div className="flex-1 p-8 text-center text-[#D94F3D]">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
          <p>Failed to load results for this test.</p>
        </div>
      </div>
    );
  }

  const totalAttempted = data.results.length;
  const avgScore = totalAttempted > 0
    ? data.results.reduce((s, r) => s + r.score, 0) / totalAttempted
    : 0;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Sticky Header Group */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 mb-8 border-b border-[#DDD8CC]">
          {/* Navigation back */}
          <Link
            href="/admin/tests"
            className="inline-flex items-center gap-1 text-sm font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#BCA147] mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Tests
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
            <div>
              <h1 className="page-title text-[#0D0F12]">{data.testTitle}</h1>
              <p className="text-sm text-[#8B9E6A] font-body mt-1">
                Total Marks:{" "}
                <span className="font-semibold text-navy/80">{data.totalMarks.toFixed(0)}</span>
              </p>
            </div>
            <a
              href={`/api/admin/tests/${testId}/export`}
              download
              className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-[#EEF0E8] px-5 py-2.5 rounded font-display font-bold uppercase tracking-wider text-xs shadow transition duration-150 flex items-center gap-2 max-w-max"
            >
              <FileDown className="w-4 h-4" /> Download Excel
            </a>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2C6E8A] text-[#EEF0E8] flex items-center justify-center shadow">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Total Takers</p>
              <h3 className="font-display font-bold text-2xl text-[#0D0F12] mt-1">{totalAttempted} Candidates</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#C9A84C] text-[#0D0F12] flex items-center justify-center shadow">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Average Score</p>
              <h3 className="font-display font-bold text-2xl text-[#0D0F12] mt-1 font-mono">
                {avgScore.toFixed(2)} <span className="text-xs font-medium text-gray-400">/ {data.totalMarks.toFixed(0)}</span>
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#8B4A6E] text-[#EEF0E8] flex items-center justify-center shadow">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Top Score</p>
              <h3 className="font-display font-bold text-2xl text-[#0D0F12] mt-1 font-mono">
                {data.results[0] ? `${data.results[0].score.toFixed(2)}` : "N/A"}
              </h3>
            </div>
          </div>
        </div>

        {/* Results Leaderboard Table */}
        <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
          <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50 rounded-t-[6px]">
            <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Official Scoreboard</h2>
            <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">Click on a row to review candidate answer sheet briefing. Click View Breakdown to see subject scores.</p>
          </div>

          {data.results.length === 0 ? (
            <div className="p-12 text-center text-gray-450 font-display">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-bold uppercase tracking-wider">No attempts submitted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 text-center">Rank</th>
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Father's Name</th>
                    <th className="px-6 py-4">Mobile</th>
                    <th className="px-6 py-4 text-center">Score</th>
                    <th className="px-6 py-4 text-center text-[#4A7C59]">Correct</th>
                    <th className="px-6 py-4 text-center text-[#D94F3D]">Wrong</th>
                    <th className="px-6 py-4 text-center text-gray-400">Unattempted</th>
                    <th className="px-6 py-4 text-center">Accuracy</th>
                    <th className="px-6 py-4 text-center">Time Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                  {data.results.map((row) => (
                    <React.Fragment key={row.id}>
                      <tr
                        onClick={() => handleRowClick(row.id, row.studentName)}
                        className="hover:bg-[#C9A84C]/5 transition duration-150 cursor-pointer"
                      >
                        <td className="px-6 py-4 text-center font-display font-bold text-md text-[#C9A84C]">
                          {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : row.rank === 3 ? "🥉 3" : row.rank}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0D0F12]">{row.studentName}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedStudentId(expandedStudentId === row.id ? null : row.id);
                              }}
                              className="text-left text-[11px] font-bold text-[#C9A84C] hover:underline mt-0.5"
                            >
                              {expandedStudentId === row.id ? "Hide Breakdown" : "View Breakdown"}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-650">{row.fatherName}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono">{row.mobile}</td>
                        <td className="px-6 py-4 text-center font-display font-bold text-[#C9A84C] text-md">{row.score.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center font-semibold text-[#4A7C59]">{row.correct}</td>
                        <td className="px-6 py-4 text-center font-semibold text-[#D94F3D]">{row.incorrect}</td>
                        <td className="px-6 py-4 text-center text-gray-400 font-mono">{row.unattempted}</td>
                        <td className="px-6 py-4 text-center font-mono">
                          <span className="bg-gray-100 border border-gray-150 px-2 py-0.5 rounded text-xs text-gray-700">{row.accuracy}%</span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500 font-mono">{formatTime(row.timeSpent)}</td>
                      </tr>
                      {expandedStudentId === row.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={10} className="px-8 py-4">
                            <div className="bg-white border border-[#DDD8CC] rounded p-4 max-w-md shadow-inner">
                              <h5 className="font-display font-bold text-xs uppercase tracking-wider text-gray-500 mb-2 border-b pb-1.5">
                                Subject Breakdown for {row.studentName}
                              </h5>
                              <div className="space-y-2">
                                {row.subjectBreakdown.map((sb) => (
                                  <div key={sb.subject} className="flex justify-between items-center text-xs font-semibold text-gray-700">
                                    <span className="uppercase text-gray-500">{sb.subject}:</span>
                                    <span>
                                      <span className="font-bold text-[#C9A84C] font-mono">{sb.score.toFixed(1)}</span> / {sb.maxMarks.toFixed(0)} Marks 
                                      <span className="text-[10px] text-gray-400 font-normal ml-1">
                                        ({sb.correct} Correct, {sb.wrong} Wrong)
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Sheet Modal Overlay */}
        {selectedAttemptId && (
          <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0D0F12] rounded shadow-xl border border-[#2E3B1E] w-full max-w-4xl max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-[#2E3B1E] flex justify-between items-center bg-[#1C2415] text-[#EEF0E8] rounded-t">
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-[#C9A84C]">Answer Key Review: {selectedStudentName}</h3>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">Test Sheet: {data.testTitle}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedAttemptId(null);
                    setReviewQuestions([]);
                  }}
                  className="bg-[#2E3B1E] hover:bg-[#2E3B1E]/80 text-[#EEF0E8] border border-[#2E3B1E] p-1.5 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0D0F12]">
                {reviewLoading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
                  </div>
                ) : reviewQuestions.length === 0 ? (
                  <p className="text-center text-[#8B9E6A] font-display uppercase font-bold py-12">No questions data available.</p>
                ) : (
                  reviewQuestions.map((q) => {
                    const isUnanswered = q.selectedOption === null;
                    const isCorrect = q.selectedOption === q.correctOption;

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded border bg-[#1C2415] transition duration-150 ${
                          isUnanswered
                            ? "border-l-4 border-l-gray-400 border-[#2E3B1E]"
                            : isCorrect
                            ? "border-l-4 border-l-[#4A7C59] border-[#2E3B1E]"
                            : "border-l-4 border-l-[#D94F3D] border-[#2E3B1E]"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h4 className="font-display font-bold text-[#EEF0E8] flex items-start gap-2.5 text-sm md:text-base">
                            <span className="bg-[#2E3B1E] text-[#C9A84C] border border-[#2E3B1E] px-2 py-0.5 rounded text-xs mt-0.5 font-bold font-mono">{q.order}</span>
                            <span className="question-text text-[#EEF0E8] leading-relaxed">{q.questionText}</span>
                          </h4>
                          {!isUnanswered && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isCorrect ? "bg-[#4A7C59]/15 text-[#4A7C59]" : "bg-[#D94F3D]/15 text-[#D94F3D]"
                            }`}>
                              {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {isCorrect ? "Correct" : "Incorrect"}
                            </span>
                          )}
                          {isUnanswered && (
                            <span className="text-[10px] bg-[#2E3B1E] text-[#8B9E6A] px-2 py-0.5 rounded font-display font-bold uppercase tracking-wider">
                              Unattempted
                            </span>
                          )}
                        </div>

                        {/* Answers Options list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs font-semibold font-body">
                          {(["A", "B", "C", "D"] as const).map((opt) => {
                            const optText = q[`option${opt}` as keyof QuestionReview] as string;
                            const isCorrectOpt = q.correctOption === opt;
                            const isSelectedOpt = q.selectedOption === opt;

                            return (
                              <div
                                key={opt}
                                className={`flex items-start gap-2.5 px-3 py-2.5 rounded border text-xs font-medium ${
                                  isCorrectOpt
                                    ? "bg-[#2E3B1E] border-[#C9A84C] text-[#F0D080]"
                                    : isSelectedOpt
                                    ? "bg-[#1C2415] border-[#D94F3D] text-[#D94F3D]"
                                    : "bg-[#0D0F12]/60 border-[#2E3B1E] text-[#EEF0E8]/70"
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 mt-0.5 ${
                                  isCorrectOpt
                                    ? "bg-[#C9A84C] text-[#0D0F12]"
                                    : isSelectedOpt
                                    ? "bg-[#D94F3D] text-[#EEF0E8]"
                                    : "border border-gray-600 text-gray-500 bg-[#0D0F12]"
                                }`}>
                                  {opt}
                                </span>
                                <span>{optText}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#2E3B1E] flex justify-end bg-[#1C2415] rounded-b">
                <button
                  onClick={() => {
                    setSelectedAttemptId(null);
                    setReviewQuestions([]);
                  }}
                  className="btn-secondary"
                >
                  Close Review
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
