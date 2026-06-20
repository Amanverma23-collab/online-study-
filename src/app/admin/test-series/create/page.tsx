"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { BatchSelect } from "@/components/batch-select";
import { getActiveBatch } from "@/lib/batch";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, AlertTriangle, Plus, X } from "lucide-react";

export default function CreateTestSeriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [batch, setBatch] = useState("NDA"); // comma-separated, e.g. "NDA" | "CDS,OTA"
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");

  const defaultSubjects = ["Mathematics", "General Knowledge", "English", "Physics", "Chemistry", "Reasoning", "Current Affairs", "Biology", "Full Mock"];

  // Pre-fill batch from the admin's currently-active batch on first load
  useEffect(() => {
    setBatch(getActiveBatch());
  }, []);

  const handleSubjectChange = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (selectedSubjects.includes(trimmed)) {
      setCustomSubject("");
      return;
    }
    setSelectedSubjects((prev) => [...prev, trimmed]);
    setCustomSubject("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!batch) {
      setError("Please select at least one batch category.");
      return;
    }

    if (selectedSubjects.length === 0) {
      setError("Please select/add at least one subject.");
      return;
    }

    setLoading(true);

    const batches = batch.split(",").map((b) => b.trim());
    let finalSubjects = [...selectedSubjects];
    if (selectedSubjects.includes("Full Mock")) {
      finalSubjects = finalSubjects.filter((s) => s !== "Full Mock");
      
      const hasNdaOrCds = batches.includes("NDA") || batches.includes("CDS");
      const hasOta = batches.includes("OTA");
      
      const additional: string[] = [];
      if (hasNdaOrCds) {
        additional.push("General Knowledge", "Mathematics", "English");
      } else if (hasOta) {
        additional.push("General Knowledge", "English");
      }
      
      for (const sub of additional) {
        if (!finalSubjects.includes(sub)) {
          finalSubjects.push(sub);
        }
      }
    }

    try {
      const res = await fetch("/api/admin/test-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          batch: batches,
          price: parseFloat(price),
          subjects: finalSubjects
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(`/admin/test-series/${data.series.id}/add-tests`);
      } else {
        setError(data.error || "Failed to create test series setup.");
      }
    } catch (err) {
      setError("Server connection issue. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 flex items-center gap-3 mb-8 border-b border-[#DDD8CC] pb-6">
          <button
            onClick={() => router.push("/admin/test-series")}
            className="p-1.5 border border-[#DDD8CC] rounded-sm bg-white hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="page-title text-[#0D0F12]">New Test Series</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Configure paid package metadata, pricing, category target, and curriculum</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Series Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UPSC CDS 2026 Comprehensive Test Series"
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Series Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Specify what curriculum topics, mock briefings, and analysis keys are included in this bundle..."
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BatchSelect
                label="Target Exam/Batch"
                value={batch}
                onChange={setBatch}
              />

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">Bundle Price (INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 499"
                  min="0"
                  className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-2.5">Curriculum Subjects (Select Multiple)</label>
              <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4 bg-gray-50 p-4 rounded border border-gray-200">
                {defaultSubjects.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(s)}
                      onChange={() => handleSubjectChange(s)}
                      className="accent-[#C9A84C] w-4 h-4"
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Or enter custom subject (e.g. Physics Section A)"
                  className="flex-1 px-3 py-2 border border-[#DDD8CC] rounded focus:outline-none text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={addCustomSubject}
                  className="px-3.5 py-2 bg-[#2E3B1E] hover:bg-[#2E3B1E]/90 text-white rounded text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {/* Display selected custom / extra subjects */}
              {selectedSubjects.some(s => !defaultSubjects.includes(s)) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedSubjects.filter(s => !defaultSubjects.includes(s)).map((s) => (
                    <span key={s} className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] font-display font-bold uppercase px-2 py-1 rounded flex items-center gap-1">
                      {s}
                      <button type="button" onClick={() => handleSubjectChange(s)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Initializing..." : "Next: Add Tests"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
