"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import Link from "next/link";
import { Video, Radio, Film, ArrowRight } from "lucide-react";
import { useActiveBatch } from "@/contexts/ActiveBatchContext";

interface SubjectSummary {
  subject: string;
  liveCount: number;
  recordedCount: number;
}

const subjectsList = [
  "General Knowledge",
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "History",
  "Geography",
  "Current Affairs",
  "Reasoning",
  "Biology",
];

// Subject → emoji mapping for visual richness
const subjectIcons: Record<string, string> = {
  "General Knowledge": "🌍",
  Mathematics: "📐",
  English: "📖",
  Physics: "⚛️",
  Chemistry: "🧪",
  History: "🏛️",
  Geography: "🗺️",
  "Current Affairs": "📰",
  Reasoning: "🧠",
  Biology: "🧬",
};

export default function ClassesHubPage() {
  const { activeBatch } = useActiveBatch();
  const [summaryData, setSummaryData] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const url = activeBatch
          ? `/api/admin/classes/subjects-summary?batch=${encodeURIComponent(activeBatch)}`
          : "/api/admin/classes/subjects-summary";
        const res = await fetch(url);
        const data = await res.json();
        setSummaryData(data);
      } catch (err) {
        console.error("Failed to fetch subjects summary:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [activeBatch]);

  const getSummary = (subject: string) => {
    return (
      summaryData.find((s) => s.subject === subject) || {
        subject,
        liveCount: 0,
        recordedCount: 0,
      }
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6">
          <div>
            <h1 className="page-title text-[#0D0F12]">Classes</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">
              Manage live Zoom sessions and recorded class videos by subject
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {subjectsList.map((subject) => {
              const summary = getSummary(subject);
              const hasContent = summary.liveCount > 0 || summary.recordedCount > 0;

              return (
                <Link
                  key={subject}
                  href={`/admin/classes/${encodeURIComponent(subject)}`}
                  className={`group bg-white rounded-[6px] border p-4 sm:p-6 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between min-h-[140px] sm:min-h-[180px] ${
                    hasContent
                      ? "border-[#C9A84C]/30 hover:border-[#C9A84C]"
                      : "border-[#DDD8CC] hover:border-[#C9A84C]/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{subjectIcons[subject] || "📚"}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#C9A84C] transition" />
                    </div>
                    <h3 className="font-display font-bold text-md text-[#0D0F12] uppercase tracking-wide group-hover:text-[#C9A84C] transition">
                      {subject}
                    </h3>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs font-display font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-[#2C6E8A]">
                      <Radio className="w-3.5 h-3.5" />
                      {summary.liveCount} Live
                    </span>
                    <span className="flex items-center gap-1.5 text-[#4A7C59]">
                      <Film className="w-3.5 h-3.5" />
                      {summary.recordedCount} Recorded
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
