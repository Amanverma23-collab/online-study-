"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, FileText, CheckCircle, Award } from "lucide-react";

interface Test {
  id: string;
  title: string;
  subject: string;
  order: number;
}

interface TestSeries {
  id: string;
  title: string;
  description: string;
  batch: string[];
  price: number;
  subjects: string[];
  isLive: boolean;
  tests: Test[];
}

export default function UpdateLiveSeriesHubPage({ params }: { params: { seriesId: string } }) {
  const seriesId = params.seriesId;
  const router = useRouter();

  const [series, setSeries] = useState<TestSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSeriesDetails();
  }, [seriesId]);

  const fetchSeriesDetails = async () => {
    try {
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const data = await res.json();
        setSeries(data);
      } else {
        setError("Failed to fetch test series details.");
      }
    } catch (err) {
      setError("Network error. Failed to load details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
        </main>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#D94F3D]">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="p-4 bg-white border border-[#DDD8CC] rounded shadow-sm text-center">
            <h3 className="font-bold">Error: Series not found</h3>
            <p className="text-xs text-gray-500 mt-2">The requested test series ID is invalid.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="sticky top-14 md:top-0 z-30 bg-[#F5F3EC] -mx-8 px-8 pt-0 md:pt-4 mt-0 md:-mt-8 flex items-center gap-3 mb-8 border-b border-[#DDD8CC] pb-6">
          <button
            onClick={() => router.push("/admin/test-series")}
            className="p-1.5 border border-[#DDD8CC] rounded-sm bg-white hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title text-[#0D0F12]">{series.title}</h1>
              <span className="bg-[#4A7C59]/10 border border-[#4A7C59]/25 text-[#4A7C59] text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                LIVE
              </span>
            </div>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Add tests immediately to live series. Newly added tests slot at the end of the unlock sequence.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {series.subjects.map((sub) => {
            const subjectTests = series.tests.filter((t) => t.subject.toLowerCase() === sub.toLowerCase());

            return (
              <div key={sub} className="bg-white rounded-[6px] border border-[#DDD8CC] p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between h-[280px]">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-display font-bold text-md text-[#0D0F12] uppercase tracking-wide truncate max-w-[150px]">{sub}</h3>
                    <span className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider">
                      {subjectTests.length} Tests
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
                    {subjectTests.length === 0 ? (
                      <p className="text-xs text-gray-400 font-semibold font-body py-4 text-center">No tests added yet for this subject.</p>
                    ) : (
                      subjectTests.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-semibold">
                          <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <span className="truncate text-gray-700">{t.title}</span>
                          <span className="font-mono text-[9px] text-[#8B9E6A] ml-auto">Seq: #{t.order}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/admin/test-series/${seriesId}/add-tests/${encodeURIComponent(sub)}`)}
                  className="w-full mt-4 bg-gray-50 border border-dashed border-[#DDD8CC] text-[#0D0F12] hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/40 text-xs font-display font-bold uppercase py-2.5 rounded transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#C9A84C]" /> Add Test
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
