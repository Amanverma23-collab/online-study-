"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { FileDown, Users, Star, Award, Clock, ArrowLeft, Check, X, ShieldAlert, BookOpen, Layers } from "lucide-react";
import Link from "next/link";
import QuestionText from "@/components/question-text";

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
  wrong: number;
  unattempted: number;
  timeTaken: number; // seconds
  subjectBreakdown: SubjectBreakdown[];
}

interface TestResultsData {
  testTitle: string;
  results: ResultRow[];
}

interface SeriesTestConfig {
  id: string;
  title: string;
  subject: string;
  order: number;
}

interface SeriesConfig {
  id: string;
  title: string;
  description: string;
  price: number;
  batch: string[];
  subjects: string[];
  tests: SeriesTestConfig[];
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

export default function SeriesResultsPage({ params }: { params: { seriesId: string } }) {
  const seriesId = params.seriesId;
  const router = useRouter();
  const [series, setSeries] = useState<SeriesConfig | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResultsData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"individual" | "cumulative">("individual");
  
  // Aggregate states
  const [cumulativeResults, setCumulativeResults] = useState<any[]>([]);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);

  // Review states
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [reviewQuestions, setReviewQuestions] = useState<QuestionReview[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Expandable breakdown
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Fetch series details
  useEffect(() => {
    fetchSeriesDetails();
  }, [seriesId]);

  // Fetch results when active tab or selected test changes
  useEffect(() => {
    if (activeTab === "individual" && selectedTestId) {
      fetchTestResults(selectedTestId);
    } else if (activeTab === "cumulative" && series) {
      fetchCumulativeResults();
    }
  }, [selectedTestId, activeTab]);

  const fetchSeriesDetails = async () => {
    try {
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const data = await res.json();
        setSeries(data);
        if (data.tests && data.tests.length > 0) {
          data.tests.sort((a: any, b: any) => a.order - b.order);
          setSelectedTestId(data.tests[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load series details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTestResults = async (testId: string) => {
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/admin/test-series/${seriesId}/results/${testId}`);
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (err) {
      console.error("Failed to load test results:", err);
    } finally {
      setResultsLoading(false);
    }
  };

  const fetchCumulativeResults = async () => {
    if (!series || series.tests.length === 0) return;
    setCumulativeLoading(true);
    try {
      const promises = series.tests.map((test) =>
        fetch(`/api/admin/test-series/${seriesId}/results/${test.id}`).then((r) => r.json())
      );
      
      const allTestResults = await Promise.all(promises);
      
      const studentMap: Record<string, {
        studentName: string;
        fatherName: string;
        mobile: string;
        totalScore: number;
        testsCompleted: number;
        testScores: Record<string, number>;
      }> = {};

      allTestResults.forEach((resData, idx) => {
        const test = series.tests[idx];
        if (resData.results && Array.isArray(resData.results)) {
          resData.results.forEach((row: ResultRow) => {
            if (!studentMap[row.mobile]) {
              studentMap[row.mobile] = {
                studentName: row.studentName,
                fatherName: row.fatherName,
                mobile: row.mobile,
                totalScore: 0,
                testsCompleted: 0,
                testScores: {},
              };
            }
            studentMap[row.mobile].totalScore += row.score;
            studentMap[row.mobile].testsCompleted += 1;
            studentMap[row.mobile].testScores[test.id] = row.score;
          });
        }
      });

      const sortedCumulative = Object.values(studentMap).sort((a, b) => b.totalScore - a.totalScore);
      
      const cumulativeWithRanks = sortedCumulative.map((row, index) => ({
        ...row,
        rank: index + 1
      }));

      setCumulativeResults(cumulativeWithRanks);
    } catch (err) {
      console.error("Failed to fetch cumulative results:", err);
    } finally {
      setCumulativeLoading(false);
    }
  };

  const handleRowClick = async (row: any) => {
    if (!row.id) {
      alert("Attempt details not available for review.");
      return;
    }
    
    setSelectedAttemptId(row.id);
    setSelectedStudentName(row.studentName);
    setReviewLoading(true);

    try {
      const res = await fetch(`/api/series-attempts/${row.id}/result`);
      const resultData = await res.json();
      setReviewQuestions(resultData.questions || []);
    } catch (err) {
      console.error("Failed to fetch solution details:", err);
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

  if (!series) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC]">
        <AdminSidebar />
        <div className="flex-1 p-8 text-center text-[#D94F3D]">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
          <p>Failed to load series details.</p>
        </div>
      </div>
    );
  }

  const totalTakers = testResults?.results?.length || 0;
  const avgScore = totalTakers > 0 
    ? (testResults?.results?.reduce((sum, r) => sum + r.score, 0) || 0) / totalTakers 
    : 0;
  const topScore = totalTakers > 0 && testResults?.results?.[0] 
    ? testResults.results[0].score 
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
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 mb-8 border-b border-[#DDD8CC] pb-6 flex flex-col gap-4">
          {/* Back Link */}
          <Link
            href="/admin/test-series"
            className="inline-flex items-center gap-1 text-sm font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#BCA147] transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Paid Test Series
          </Link>

          {/* Series Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="page-title text-[#0D0F12]">{series.title}</h1>
              <p className="text-sm text-[#8B9E6A] font-body mt-1">
                Price: <span className="font-semibold text-navy/80">₹{series.price}</span> &bull; 
                Batches: <span className="font-semibold text-navy/80">{series.batch.join(", ")}</span> &bull; 
                Total Tests: <span className="font-semibold text-navy/80">{series.tests.length}</span>
              </p>
            </div>
            
            <div className="flex bg-white rounded border border-[#DDD8CC] p-1 self-start md:self-auto shadow-sm">
              <button
                onClick={() => setActiveTab("individual")}
                className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === "individual"
                    ? "bg-[#0D0F12] text-[#EEF0E8]"
                    : "text-[#8B9E6A] hover:text-[#0D0F12]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 inline mr-1.5" /> Test-Wise Results
              </button>
              <button
                onClick={() => setActiveTab("cumulative")}
                className={`px-4 py-2 font-display text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === "cumulative"
                    ? "bg-[#0D0F12] text-[#EEF0E8]"
                    : "text-[#8B9E6A] hover:text-[#0D0F12]"
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1.5" /> Cumulative Leaderboard
              </button>
            </div>
          </div>
        </div>

        {activeTab === "individual" ? (
          <>
            {/* Test Selector Dropdown */}
            <div className="bg-white p-4 rounded-[6px] border border-[#DDD8CC] shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Select Subject Test:</span>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="border border-[#DDD8CC] rounded px-3 py-2 bg-[#F5F3EC] text-[#0D0F12] font-display font-semibold uppercase text-xs focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                >
                  {series.tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {resultsLoading ? (
              <div className="py-24 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C] mx-auto"></div>
              </div>
            ) : !testResults || testResults.results.length === 0 ? (
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-display font-semibold uppercase tracking-wider text-[#0D0F12]">No attempt submissions yet</p>
                <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Candidates have not submitted attempts for this test.</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#2C6E8A] text-[#EEF0E8] flex items-center justify-center shadow">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Total Takers</p>
                      <h3 className="font-display font-bold text-2xl text-[#0D0F12] mt-1">{totalTakers} Candidates</h3>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#C9A84C] text-[#0D0F12] flex items-center justify-center shadow">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">Average Score</p>
                      <h3 className="font-display font-bold text-2xl text-[#0D0F12] mt-1 font-mono">
                        {avgScore.toFixed(2)}
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
                        {topScore.toFixed(2)}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Scoreboard Table */}
                <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
                  <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50 rounded-t-[6px]">
                    <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Official Scoreboard</h2>
                    <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">Click on a row to review candidate answer sheet briefing. Click View Breakdown to see subject scores.</p>
                  </div>

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
                          <th className="px-6 py-4 text-center">Time Taken</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                        {testResults.results.map((row: any) => (
                          <React.Fragment key={row.id}>
                            <tr
                              onClick={() => handleRowClick(row)}
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
                              <td className="px-6 py-4 text-center font-semibold text-[#D94F3D]">{row.wrong}</td>
                              <td className="px-6 py-4 text-center text-gray-400 font-mono">{row.unattempted}</td>
                              <td className="px-6 py-4 text-center text-gray-500 font-mono">{formatTime(row.timeTaken)}</td>
                            </tr>
                            {expandedStudentId === row.id && (
                              <tr className="bg-gray-50/50">
                                <td colSpan={9} className="px-8 py-4">
                                  <div className="bg-white border border-[#DDD8CC] rounded p-4 max-w-md shadow-inner">
                                    <h5 className="font-display font-bold text-xs uppercase tracking-wider text-gray-500 mb-2 border-b pb-1.5">
                                      Subject Breakdown for {row.studentName}
                                    </h5>
                                    <div className="space-y-2">
                                      {row.subjectBreakdown && row.subjectBreakdown.map((sb: any) => (
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
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Cumulative Tab */}
            {cumulativeLoading ? (
              <div className="py-24 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C] mx-auto"></div>
              </div>
            ) : cumulativeResults.length === 0 ? (
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-display font-semibold uppercase tracking-wider text-[#0D0F12]">No cumulative submissions yet</p>
                <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Candidates have not submitted any test attempts inside this series.</p>
              </div>
            ) : (
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
                <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50 rounded-t-[6px]">
                  <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Cumulative Leaderboard</h2>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">Sum of scores across all completed subject tests in the series</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-body">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 text-center">Rank</th>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Father's Name</th>
                        <th className="px-6 py-4">Mobile</th>
                        <th className="px-6 py-4 text-center">Completed Tests</th>
                        <th className="px-6 py-4 text-center text-[#C9A84C]">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                      {cumulativeResults.map((row) => (
                        <tr key={row.mobile} className="hover:bg-gray-50 transition duration-150">
                          <td className="px-6 py-4 text-center font-display font-bold text-md text-[#C9A84C]">
                            {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : row.rank === 3 ? "🥉 3" : row.rank}
                          </td>
                          <td className="px-6 py-4 font-bold text-[#0D0F12]">{row.studentName}</td>
                          <td className="px-6 py-4 text-gray-650">{row.fatherName}</td>
                          <td className="px-6 py-4 text-gray-500 font-mono">{row.mobile}</td>
                          <td className="px-6 py-4 text-center font-mono">
                            <span className="bg-navy/10 text-navy border border-navy/20 px-2.5 py-0.5 rounded text-xs font-semibold">
                              {row.testsCompleted} / {series.tests.length}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-display font-bold text-[#C9A84C] text-md font-mono">
                            {row.totalScore.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Answer Review Sheet Modal Overlay */}
        {selectedAttemptId && (
          <div className="fixed inset-0 bg-[#0D0F12]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0D0F12] rounded shadow-xl border border-[#2E3B1E] w-full max-w-4xl max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-[#2E3B1E] flex justify-between items-center bg-[#1C2415] text-[#EEF0E8] rounded-t">
                <div>
                  <h3 className="font-display font-bold text-lg uppercase tracking-wider text-[#C9A84C]">Answer Key Review: {selectedStudentName}</h3>
                  <p className="text-xs text-[#8B9E6A] font-semibold mt-0.5">Test: {testResults?.testTitle}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedAttemptId(null);
                    setReviewQuestions([]);
                  }}
                  className="bg-[#2E3B1E] hover:bg-[#2E3B1E]/85 text-[#EEF0E8] border border-[#2E3B1E] p-1.5 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0D0F12]">
                {reviewLoading ? (
                  <div className="flex items-center justify-center py-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C] mx-auto"></div>
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
                            <span className="question-text text-[#EEF0E8] leading-relaxed"><QuestionText text={q.questionText} /></span>
                          </h4>
                          {!isUnanswered && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isCorrect ? "bg-[#4A7C59]/15 text-[#4A7C59]" : "bg-[#D94F3D]/15 text-[#D94F3D]"
                            }`}>
                              {isCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
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
