"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { FileText, Radio, Users, CheckCircle, ArrowRight, Play, Square, Trophy, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";
import { useActiveBatch } from "@/contexts/ActiveBatchContext";

interface Stats {
  totalTests: number;
  liveTests: number;
  totalStudents: number;
  totalAttempts: number;
  smsBalance?: number;
  smsEnabled?: boolean;
}

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

export default function AdminDashboard() {
  const { activeBatch } = useActiveBatch();
  const [stats, setStats] = useState<Stats>({
    totalTests: 0,
    liveTests: 0,
    totalStudents: 0,
    totalAttempts: 0,
    smsBalance: 0,
    smsEnabled: false
  });
  const [recentTests, setRecentTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleTests = activeBatch
    ? recentTests.filter((test) =>
        test.batch
          ? test.batch
              .split(",")
              .map((b) => b.trim())
              .includes(activeBatch)
          : false
      )
    : recentTests;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const batchParam = activeBatch ? `?batch=${activeBatch}` : "";
        const [statsRes, testsRes] = await Promise.all([
          fetch(`/api/admin/stats${batchParam}`),
          fetch("/api/tests")
        ]);
        const statsData = await statsRes.json();
        const testsData = await testsRes.json();

        setStats(statsData);
        setRecentTests(testsData.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeBatch]);

  useEffect(() => {
    const hasAsked = localStorage.getItem("fcm_permission_asked_admin");
    if (!hasAsked) {
      const getAdminSession = async () => {
        try {
          const res = await fetch("/api/auth/session");
          const session = await res.json();
          const adminId = session?.user?.id;
          if (adminId) {
            setTimeout(() => {
              import("@/lib/firebase-client")
                .then(({ requestNotificationPermission }) => {
                  requestNotificationPermission(adminId, "admin");
                  localStorage.setItem("fcm_permission_asked_admin", "true");
                })
                .catch((err) => {
                  console.error("Failed to dynamically import firebase client:", err);
                });
            }, 3000);
          }
        } catch (err) {
          console.error("Failed to check admin session for FCM:", err);
        }
      };
      getAdminSession();
    }
  }, []);

  const handleToggleLive = async (testId: string) => {
    try {
      const res = await fetch(`/api/tests/${testId}/toggle`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setRecentTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, isLive: data.isLive } : t))
        );
        // Refresh stats
        const statsRes = await fetch("/api/admin/stats");
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to toggle live state:", err);
    }
  };

  const statCards = [
    { title: "Total Tests", value: stats.totalTests, icon: FileText, color: "text-[#2C6E8A]" },
    { title: "Live Tests", value: stats.liveTests, icon: Radio, color: "text-[#4A7C59]" },
    { title: "Total Students", value: stats.totalStudents, icon: Users, color: "text-[#C9A84C]" },
    { title: "Total Attempts", value: stats.totalAttempts, icon: CheckCircle, color: "text-[#6B4E8A]" }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-30 bg-[#F5F3EC] -mx-8 px-8 pt-0 md:pt-4 mt-0 md:-mt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6 relative">
          <div>
            <h1 className="page-title text-[#0D0F12]">Briefing Overview</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Manage military test templates, live schedules, and results sheet exports</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <NotificationBell userType="admin" />
            </div>
            <Link href="/admin/create-test" className="btn-primary max-w-max">
              <Plus className="w-4 h-4" /> Create test setup
            </Link>
          </div>
        </div>

        {/* MSG91 Wallet Balance Warning Banner */}
        {!loading && stats.smsEnabled && stats.smsBalance !== undefined && stats.smsBalance < 50 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-[6px] text-amber-800 text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Low SMS Wallet Balance Warning: </span>
                <span>Your MSG91 wallet balance is extremely low (<strong>₹{stats.smsBalance.toFixed(2)}</strong>). Please recharge your MSG91 account to ensure students can receive OTPs.</span>
              </div>
            </div>
            <a
              href="https://control.msg91.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#EEF0E8] bg-[#0D0F12] px-3.5 py-1.5 rounded transition shadow-sm ml-4 whitespace-nowrap"
            >
              Recharge Wallet
            </a>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">{card.title}</p>
                      <h3 className="font-display font-bold text-3xl mt-1 text-[#0D0F12]">{card.value}</h3>
                    </div>
                    <div className={`p-2.5 rounded bg-gray-50 border border-gray-150 ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Tests Section */}
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
              <div className="p-6 border-b border-[#DDD8CC] flex justify-between items-center bg-gray-50/50 rounded-t-[6px]">
                <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Recent Mock Exams</h2>
                <Link
                  href="/admin/tests"
                  className="text-sm font-display font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#F0D080] transition flex items-center gap-1"
                >
                  All exam sheets <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {visibleTests.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-sm">No exam templates found</p>
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
                            <div className="flex items-center justify-center gap-3">
                              {/* Toggle Live */}
                              <button
                                onClick={() => handleToggleLive(test.id)}
                                className={`p-1.5 rounded border transition duration-150 ${
                                  test.isLive
                                    ? "bg-red-50 text-[#D94F3D] border-red-100 hover:bg-red-100"
                                    : "bg-green-50 text-[#4A7C59] border-green-100 hover:bg-green-100"
                                }`}
                                title={test.isLive ? "Set Offline" : "Set Live"}
                              >
                                {test.isLive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                              </button>

                              {/* View Results */}
                              <Link
                                href={`/admin/tests/${test.id}/results`}
                                className="inline-flex items-center gap-1 bg-[#C9A84C]/10 hover:bg-[#C9A84C]/25 text-[#C9A84C] px-3.5 py-1.5 rounded border border-[#C9A84C]/20 font-display font-bold uppercase tracking-wider text-xs"
                              >
                                <Trophy className="w-3.5 h-3.5" />
                                Scoreboard
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
