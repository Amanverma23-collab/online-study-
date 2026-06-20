"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Play, Square, Trash2, Trophy, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useActiveBatch } from "@/contexts/ActiveBatchContext";

interface Test {
  id: string;
  title: string;
  subject: string;
  duration: number;
  isLive: boolean;
  totalMarks: number;
  createdAt: string;
  batch: string;
  _count: {
    questions: number;
    attempts: number;
  };
}

export default function MyTestsPage() {
  const { activeBatch } = useActiveBatch();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleTests = activeBatch
    ? tests.filter((test) =>
        test.batch
          ? test.batch
              .split(",")
              .map((b) => b.trim())
              .includes(activeBatch)
          : false
      )
    : tests;

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/tests");
      const data = await res.json();
      setTests(data);
    } catch (err) {
      console.error("Failed to fetch tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLive = async (testId: string) => {
    try {
      const res = await fetch(`/api/tests/${testId}/toggle`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, isLive: data.isLive } : t))
        );
      }
    } catch (err) {
      console.error("Failed to toggle live state:", err);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test? All questions and student attempts will be permanently deleted.")) {
      return;
    }

    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTests((prev) => prev.filter((t) => t.id !== testId));
      }
    } catch (err) {
      console.error("Failed to delete test:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-30 bg-[#F5F3EC] -mx-8 px-8 pt-0 md:pt-4 mt-0 md:-mt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6">
          <div>
            <h1 className="page-title text-[#0D0F12]">Exam Templates</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Manage created test schedules, toggle live states, and inspect scoreboards</p>
          </div>
          <Link href="/admin/create-test" className="btn-primary max-w-max">
            <Plus className="w-4 h-4" /> Create Test
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : (
          <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
            {visibleTests.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-display font-bold text-lg text-navy mb-1 uppercase">No Tests Found</h3>
                <p className="text-xs text-[#8B9E6A] font-semibold mb-6">Initialize a new test parameters sheet to begin.</p>
                <Link
                  href="/admin/create-test"
                  className="btn-primary"
                >
                  Create Setup
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-body">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                      <th className="px-6 py-4">Test Title</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4 text-center">Batch</th>
                      <th className="px-6 py-4 text-center">Questions</th>
                      <th className="px-6 py-4 text-center">Duration</th>
                      <th className="px-6 py-4 text-center">Total Marks</th>
                      <th className="px-6 py-4 text-center">Attempts</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                    {visibleTests.map((test) => (
                      <tr key={test.id} className="hover:bg-gray-50/50 transition duration-100">
                        <td className="px-6 py-4 font-bold text-[#0D0F12]">{test.title}</td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 border border-gray-200 text-[#0D0F12] px-2.5 py-1 rounded text-xs uppercase font-display font-bold tracking-wider">
                            {test.subject}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {(test.batch ? test.batch.split(",") : ["NDA"]).map((b) => (
                              <span key={b} className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                                {b}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-display font-bold text-md">{test._count.questions}</td>
                        <td className="px-6 py-4 text-center text-gray-500 font-mono">{test.duration} mins</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-700">
                          {(test.totalMarks || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center font-display font-bold text-[#2C6E8A] text-md">{test._count.attempts}</td>
                        <td className="px-6 py-4 text-center">
                          {test.isLive ? (
                            <span className="inline-flex items-center gap-1 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 px-2.5 py-1 rounded text-xs font-display font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] animate-pulse"></span>
                              LIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded text-xs font-display font-bold uppercase tracking-wider">
                              OFFLINE
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Toggle Live */}
                            <button
                              onClick={() => handleToggleLive(test.id)}
                              className={`p-1.5 rounded border transition duration-155 ${
                                test.isLive
                                  ? "bg-red-50 text-[#D94F3D] border-red-100 hover:bg-red-100"
                                  : "bg-green-50 text-[#4A7C59] border-green-100 hover:bg-green-100"
                              }`}
                              title={test.isLive ? "Go Offline" : "Go Live"}
                            >
                              {test.isLive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>

                            {/* Results Link */}
                            <Link
                              href={`/admin/tests/${test.id}/results`}
                              className="inline-flex items-center gap-1 bg-[#C9A84C]/10 hover:bg-[#C9A84C]/25 text-[#C9A84C] px-3.5 py-1.5 rounded border border-[#C9A84C]/20 font-display font-bold uppercase tracking-wider text-xs"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Results
                            </Link>

                            {/* Delete Test */}
                            <button
                              onClick={() => handleDeleteTest(test.id)}
                              className="p-1.5 rounded border bg-red-50 text-[#D94F3D] border-red-100 hover:bg-red-100 transition duration-150"
                              title="Delete Test"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
