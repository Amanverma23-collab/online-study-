"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, Megaphone } from "lucide-react";
import { BATCH_OPTIONS } from "@/lib/batch";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [batch, setBatch] = useState(""); // "" = All Batches
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          batch: batch || null, // null = all students
          link: link || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setTitle("");
        setMessage("");
        setLink("");
        setBatch("");
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        setError(data.error || "Failed to publish announcement.");
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
        <div className="sticky top-14 md:top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-0 md:pt-4 mt-0 md:-mt-8 mb-8 border-b border-[#DDD8CC] pb-6">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] hover:text-[#0D0F12] transition mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-full flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#4A7C59]" />
            </div>
            <div>
              <h1 className="page-title text-[#0D0F12]">Broadcast Announcement</h1>
              <p className="text-sm text-[#8B9E6A] font-body mt-0.5">
                Send notifications and FCM push alerts to cadets
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="mb-6 p-4 bg-[#4A7C59]/10 border border-[#4A7C59] rounded text-[#4A7C59] text-sm flex items-center gap-2 font-bold font-display uppercase tracking-wide max-w-2xl shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            Announcement published and alerts dispatched successfully!
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs flex items-start gap-2 font-semibold max-w-2xl shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-8 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Announcement Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CDS Mock Exam Schedule Postponed"
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Target Batch
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold bg-white"
              >
                <option value="">All Batches (General Broadcast)</option>
                {BATCH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Target Redirect Link (Optional)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="e.g. /student/classes"
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
              />
              <p className="text-[10px] text-[#8B9E6A] mt-1 font-body">
                The page url students will be redirected to when clicking this notification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                Message Content
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the details of the announcement briefing..."
                rows={6}
                className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold resize-none"
                required
              />
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Publishing briefing..." : "Publish briefing"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
