"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { FileDown, Users, Search, Clock, ShieldAlert, Trash2, Ban, UserCheck } from "lucide-react";
import Link from "next/link";

interface Cadet {
  id: string;
  name: string;
  fatherName: string;
  mobile: string;
  status: string;
  batch: string;
  attemptsCount: number;
  submittedAttemptsCount: number;
}

export default function CadetsPage() {
  const [cadets, setCadets] = useState<Cadet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("ALL");

  useEffect(() => {
    fetchCadets(selectedBatch);
    localStorage.setItem("cadetsLastChecked", new Date().toISOString());
  }, [selectedBatch]);

  const fetchCadets = async (batch: string) => {
    try {
      const url = batch === "ALL" ? "/api/admin/cadets" : `/api/admin/cadets?batch=${batch}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCadets(data);
      }
    } catch (err) {
      console.error("Failed to fetch cadets list:", err);
    } finally {
      setLoading(false);
    }
  };

  const [deletingCadet, setDeletingCadet] = useState<Cadet | null>(null);

  const confirmDelete = (cadet: Cadet) => {
    setDeletingCadet(cadet);
  };

  const handleDelete = async () => {
    if (!deletingCadet) return;
    try {
      const res = await fetch(`/api/admin/cadets/${deletingCadet.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCadets((prev) => prev.filter((c) => c.id !== deletingCadet.id));
      } else {
        alert(data.error || "Failed to delete cadet.");
      }
    } catch (err) {
      console.error("Failed to delete cadet:", err);
      alert("Failed to delete cadet due to a network error.");
    } finally {
      setDeletingCadet(null);
    }
  };

  const handleToggleStatus = async (cadetId: string) => {
    try {
      const res = await fetch(`/api/admin/cadets/${cadetId}/toggle`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setCadets((prev) =>
          prev.map((c) => (c.id === cadetId ? { ...c, status: data.status } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle cadet status:", err);
    }
  };

  const filteredCadets = cadets.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.fatherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery);

    const matchesBatch =
      selectedBatch === "ALL" ||
      c.batch.toUpperCase() === selectedBatch.toUpperCase();

    return matchesSearch && matchesBatch;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#DDD8CC] pb-6">
          <div>
            <h1 className="page-title text-[#0D0F12]">Registered Cadets</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">
              List of all candidate credentials registered on the student mock test portal
            </p>
          </div>
          <a
            href={selectedBatch === "ALL" ? "/api/admin/cadets/export" : `/api/admin/cadets/export?batch=${selectedBatch}`}
            download
            className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-[#EEF0E8] px-5 py-2.5 rounded font-display font-bold uppercase tracking-wider text-xs shadow transition duration-150 flex items-center gap-2 max-w-max"
          >
            <FileDown className="w-4 h-4" /> Download Cadets List
          </a>
        </div>

        {/* Search Input, Batch Filter and Total Counter Card */}
        <div className="bg-white p-6 rounded-[6px] border border-[#DDD8CC] shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#8B9E6A]" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, father's name or mobile..."
                className="w-full pl-9 pr-4 py-2 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
              />
            </div>
            
            <div className="w-full sm:w-48">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold bg-white"
              >
                <option value="ALL">All Batches</option>
                <option value="NDA">NDA</option>
                <option value="CDS">CDS</option>
                <option value="OTA">OTA</option>
              </select>
            </div>
          </div>
          <div className="bg-[#1C2415] border border-[#2E3B1E] text-[#C9A84C] font-display font-bold uppercase tracking-wider px-4 py-2 text-xs rounded-sm max-w-max">
            Total Cadets: {filteredCadets.length}
          </div>
        </div>

        {/* Cadets Table */}
        <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
          <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50 rounded-t-[6px] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C9A84C]" />
            <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12]">Candidate Briefing Sheets</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
            </div>
          ) : filteredCadets.length === 0 ? (
            <div className="p-12 text-center text-gray-450 font-display">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-bold uppercase tracking-wider">No cadets registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-body">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#DDD8CC] text-[#8B9E6A] font-display font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 text-center w-20">S.No.</th>
                    <th className="px-6 py-4">Cadet Name</th>
                    <th className="px-6 py-4">Father's Name</th>
                    <th className="px-6 py-4">Mobile Number</th>
                    <th className="px-6 py-4 text-center">Batch</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Attempts Started</th>
                    <th className="px-6 py-4 text-center">Attempts Submitted</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD8CC] text-sm font-semibold">
                  {filteredCadets.map((cadet, index) => (
                    <tr key={cadet.id} className="hover:bg-[#C9A84C]/5 transition duration-100">
                      <td className="px-6 py-4 text-center font-display font-bold text-[#8B9E6A]">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-[#0D0F12]">{cadet.name}</td>
                      <td className="px-6 py-4 text-gray-650">{cadet.fatherName}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono">{cadet.mobile}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 px-2 py-0.5 rounded text-xs font-display font-bold uppercase tracking-wider">
                          {cadet.batch}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {cadet.status === "BANNED" ? (
                          <span className="inline-flex items-center gap-1 bg-[#D94F3D]/10 text-[#D94F3D] border border-[#D94F3D]/20 px-2.5 py-1 rounded text-xs font-display font-bold uppercase tracking-wider">
                            BANNED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 px-2.5 py-1 rounded text-xs font-display font-bold uppercase tracking-wider">
                            VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-display font-bold text-[#2C6E8A] text-md">
                        {cadet.attemptsCount}
                      </td>
                      <td className="px-6 py-4 text-center font-display font-bold text-[#4A7C59] text-md">
                        {cadet.submittedAttemptsCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(cadet.id)}
                            className={`p-2 rounded transition duration-150 border flex items-center justify-center ${
                              cadet.status === "BANNED"
                                ? "bg-[#4A7C59]/10 hover:bg-[#4A7C59]/25 text-[#4A7C59] border-[#4A7C59]/25"
                                : "bg-[#D94F3D]/10 hover:bg-[#D94F3D]/25 text-[#D94F3D] border-[#D94F3D]/25"
                            }`}
                            title={cadet.status === "BANNED" ? "Verify Cadet" : "Ban Cadet"}
                          >
                            {cadet.status === "BANNED" ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => confirmDelete(cadet)}
                            className="p-2 rounded transition duration-155 border bg-[#D94F3D] hover:bg-[#C23B2A] text-white border-[#D94F3D] hover:border-[#C23B2A] flex items-center justify-center"
                            title="Delete Cadet"
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
      </main>

      {deletingCadet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-lg max-w-md w-full p-6 text-left">
            <h3 className="font-display font-bold text-lg text-[#D94F3D] uppercase tracking-wider mb-2 flex items-center gap-2">
              ⚠️ Delete Cadet?
            </h3>
            <p className="text-sm font-body text-[#0D0F12] leading-relaxed mb-4">
              You are about to permanently delete <strong className="font-bold">{deletingCadet.name}</strong>'s account (Mobile: <strong className="font-mono">{deletingCadet.mobile}</strong>).
            </p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded text-xs text-gray-650 space-y-2 mb-6 font-semibold">
              <p>This will:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Permanently remove their account and all associated data</li>
                <li>Free up their mobile number for future registration</li>
                <li>They will need to register again from scratch to use the platform</li>
              </ul>
              <p className="text-[#D94F3D] font-bold">This action CANNOT be undone.</p>
            </div>
            <div className="flex justify-end gap-3 font-display text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => setDeletingCadet(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#0D0F12] border border-gray-300 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-[#D94F3D] hover:bg-[#C23B2A] text-white border border-[#D94F3D] rounded transition"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
