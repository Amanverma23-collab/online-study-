"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, Radio } from "lucide-react";
import { BatchSelect } from "@/components/batch-select";
import { getActiveBatch } from "@/lib/batch";

export default function AddLiveClassPage() {
  const params = useParams();
  const router = useRouter();
  const subject = decodeURIComponent(params.subject as string);

  const [title, setTitle] = useState("");
  const [batch, setBatch] = useState("NDA");
  const [details, setDetails] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [classDate, setClassDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setBatch(getActiveBatch());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/classes/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          title,
          details,
          zoomLink,
          classDate,
          batch,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/admin/classes/${encodeURIComponent(subject)}`);
        }, 1500);
      } else {
        setError(data.error || "Failed to create live class.");
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
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 mb-8 border-b border-[#DDD8CC] pb-6">
          <button
            onClick={() =>
              router.push(`/admin/classes/${encodeURIComponent(subject)}`)
            }
            className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] hover:text-[#0D0F12] transition mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {subject}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2C6E8A]/10 border border-[#2C6E8A]/20 rounded-full flex items-center justify-center">
              <Radio className="w-5 h-5 text-[#2C6E8A]" />
            </div>
            <div>
              <h1 className="page-title text-[#0D0F12]">Add Live Class</h1>
              <p className="text-sm text-[#8B9E6A] font-body mt-0.5">
                {subject} — Schedule a new Zoom session
              </p>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {success && (
          <div className="mb-6 p-4 bg-[#4A7C59]/10 border border-[#4A7C59] rounded text-[#4A7C59] text-sm flex items-center gap-2 font-bold">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ✅ Live class added! Redirecting...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Class Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Geometry Class 2"
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <BatchSelect
              label="Target Exam/Batch"
              value={batch}
              onChange={setBatch}
            />

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Class Details
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What will be covered in this class..."
                rows={4}
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Zoom Link
              </label>
              <input
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={classDate}
                onChange={(e) => setClassDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={loading || success}
                className="btn-primary"
              >
                {loading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
