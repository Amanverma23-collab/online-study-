"use client";

import React, { useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, Film } from "lucide-react";

export default function AddRecordedClassPage() {
  const params = useParams();
  const router = useRouter();
  const subject = decodeURIComponent(params.subject as string);

  const [className, setClassName] = useState("");
  const [details, setDetails] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [notesUrl, setNotesUrl] = useState("");
  const [notesName, setNotesName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/classes/recorded/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          className,
          details,
          youtubeLink,
          notesUrl: notesUrl || null,
          notesName: notesName || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/admin/classes/${encodeURIComponent(subject)}`);
        }, 1500);
      } else {
        setError(data.error || "Failed to create recorded class.");
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
            <div className="w-10 h-10 bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-full flex items-center justify-center">
              <Film className="w-5 h-5 text-[#4A7C59]" />
            </div>
            <div>
              <h1 className="page-title text-[#0D0F12]">
                Add Recorded Class
              </h1>
              <p className="text-sm text-[#8B9E6A] font-body mt-0.5">
                {subject} — Upload a class recording
              </p>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {success && (
          <div className="mb-6 p-4 bg-[#4A7C59]/10 border border-[#4A7C59] rounded text-[#4A7C59] text-sm flex items-center gap-2 font-bold">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ✅ Recorded class added! Redirecting...
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
                Class Name
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Geometry Class 2"
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Class Details
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Description of what was covered in this class..."
                rows={4}
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                YouTube Link
              </label>
              <input
                type="url"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div className="bg-gray-50 rounded-[6px] border border-[#DDD8CC] p-5 space-y-4">
              <p className="text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A]">
                Class Notes (Optional)
              </p>
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Notes URL
                </label>
                <input
                  type="url"
                  value={notesUrl}
                  onChange={(e) => setNotesUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or any PDF link"
                  className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Notes Display Name
                </label>
                <input
                  type="text"
                  value={notesName}
                  onChange={(e) => setNotesName(e.target.value)}
                  placeholder="e.g. Geometry Notes Chapter 2.pdf"
                  className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold bg-white"
                />
              </div>
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
