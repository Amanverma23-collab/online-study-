"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, ToggleLeft, ToggleRight, Package, AlertTriangle, ListCollapse, Award } from "lucide-react";

interface TestEntry {
  id: string;
  title: string;
  subject: string;
}

interface TestSeries {
  id: string;
  title: string;
  description: string;
  batch: string[];
  price: number;
  subjects: string[];
  isLive: boolean;
  createdAt: string;
  tests: TestEntry[];
  _count: { purchases: number };
}

export default function AdminTestSeriesPage() {
  const router = useRouter();
  const [seriesList, setSeriesList] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const res = await fetch("/api/admin/test-series");
      if (res.ok) {
        const data = await res.json();
        setSeriesList(data);
      } else {
        setError("Failed to fetch test series list.");
      }
    } catch (err) {
      setError("Network error. Failed to load series list.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentLive: boolean) => {
    try {
      const res = await fetch("/api/admin/test-series/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isLive: !currentLive })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeriesList((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isLive: !currentLive } : s))
        );
      } else {
        alert(data.error || "Failed to update series status.");
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test series? All enrolled students will lose access and attempts will be deleted.")) return;

    try {
      const res = await fetch("/api/admin/test-series/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSeriesList((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete test series.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6">
          <div>
            <h1 className="page-title text-[#0D0F12]">Paid Test Series</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Manage paid subject-wise test bundles, unlock structures, and checkout analytics</p>
          </div>
          <button
            onClick={() => router.push("/admin/test-series/create")}
            className="btn-primary flex items-center gap-2 max-w-max"
          >
            <Plus className="w-4 h-4" /> Create Test Series
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : seriesList.length === 0 ? (
          <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-16 text-center shadow-sm">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-display font-bold text-lg uppercase text-navy mb-1">No Test Series Created Yet</h3>
            <p className="text-xs text-[#8B9E6A] font-semibold">Deploy a new sequential briefing test series for NDA/CDS candidates.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F3EC] border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Batches</th>
                    <th className="px-6 py-4">Subjects</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Tests</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold text-[#0D0F12]">
                  {seriesList.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-sm text-[#0D0F12] uppercase tracking-wide truncate">{s.title}</div>
                        <div className="text-xs text-[#8B9E6A] font-medium font-body truncate mt-0.5">{s.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {s.batch.map((b) => (
                            <span key={b} className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.subjects.map((sub) => (
                            <span key={sub} className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded-sm">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[#C9A84C] font-bold">
                        ₹{s.price.toFixed(0)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        {s.tests.length}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-display font-bold uppercase tracking-wider ${
                          s.isLive
                            ? "bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/25"
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        }`}>
                          {s.isLive ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/test-series/${s.id}/results`)}
                            className="p-1.5 border border-[#DDD8CC] hover:bg-gray-50 text-gray-600 rounded transition"
                            title="View Student Results"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(s.isLive ? `/admin/test-series/${s.id}/update` : `/admin/test-series/${s.id}/add-tests`)}
                            className="p-1.5 border border-[#DDD8CC] hover:bg-gray-50 text-[#C9A84C] rounded transition"
                            title={s.isLive ? "Update Tests List" : "Add/Configure Tests"}
                          >
                            <ListCollapse className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggle(s.id, s.isLive)}
                            className={`p-1.5 border rounded transition ${
                              s.isLive 
                                ? "bg-green-50 border-green-100 text-[#4A7C59] hover:bg-green-100" 
                                : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                            }`}
                            title={s.isLive ? "Take Offline (Draft)" : "Make Live"}
                          >
                            {s.isLive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-[#D94F3D] rounded transition"
                            title="Delete Series"
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
          </div>
        )}
      </main>
    </div>
  );
}
