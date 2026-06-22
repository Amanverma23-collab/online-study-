"use client";

import React, { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, Megaphone, Edit, Trash2, Calendar } from "lucide-react";
import { BATCH_OPTIONS } from "@/lib/batch";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"publish" | "manage">("publish");

  // Publish Form States
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [batch, setBatch] = useState(""); // "" = All Batches
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Manage Announcements States
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState("");

  // Edit Modal States
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (subTab === "manage") {
      fetchAnnouncements();
    }
  }, [subTab]);

  const fetchAnnouncements = async () => {
    setAnnouncementsLoading(true);
    setAnnouncementsError("");
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      } else {
        setAnnouncementsError("Failed to load announcements.");
      }
    } catch (err) {
      setAnnouncementsError("Could not fetch announcements from server.");
    } finally {
      setAnnouncementsLoading(false);
    }
  };

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert("Failed to delete announcement.");
      }
    } catch (err) {
      alert("Error deleting announcement.");
    }
  };

  const startEdit = (ann: any) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title);
    setEditMessage(ann.message);
    setEditBatch(ann.batch || "");
    setEditLink(ann.link || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements/${editingAnnouncement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          message: editMessage,
          batch: editBatch || null,
          link: editLink || null
        })
      });
      if (res.ok) {
        setEditingAnnouncement(null);
        fetchAnnouncements();
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      alert("Error saving announcement changes.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-0 md:pt-4 mt-0 md:-mt-8 mb-6 border-b border-[#DDD8CC] pb-6">
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
              <h1 className="page-title text-[#0D0F12] uppercase font-bold !text-[6.2vw] sm:!text-xl md:!text-2xl !tracking-tight sm:!tracking-normal whitespace-nowrap">
                Broadcast Announcement
              </h1>
              <p className="text-sm text-[#8B9E6A] font-body mt-0.5">
                Send notifications and FCM push alerts to cadets
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#DDD8CC] mb-6 font-display font-bold uppercase tracking-wider text-xs">
          <button
            onClick={() => setSubTab("publish")}
            className={`px-6 py-3 border-b-2 transition-colors duration-200 ${
              subTab === "publish"
                ? "border-[#C9A84C] text-[#C9A84C]"
                : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
            }`}
          >
            Publish Announcement
          </button>
          <button
            onClick={() => setSubTab("manage")}
            className={`px-6 py-3 border-b-2 transition-colors duration-200 ${
              subTab === "manage"
                ? "border-[#C9A84C] text-[#C9A84C]"
                : "border-transparent text-[#8B9E6A] hover:text-[#0D0F12]"
            }`}
          >
            Manage Announcements
          </button>
        </div>

        {subTab === "publish" ? (
          <>
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
          </>
        ) : (
          <div className="max-w-4xl">
            {announcementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
              </div>
            ) : announcementsError ? (
              <div className="p-4 bg-red-50 border border-[#D94F3D] rounded text-[#D94F3D] text-xs font-semibold">
                {announcementsError}
              </div>
            ) : announcements.length === 0 ? (
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-12 text-center text-gray-400 shadow-sm">
                <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-display font-semibold uppercase tracking-wider text-sm text-[#0D0F12]">No announcements published yet</p>
                <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Publish your first broadcast under the Publish tab.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm p-6 flex flex-col md:flex-row justify-between md:items-start gap-4 hover:shadow-md transition duration-150">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          ann.batch 
                            ? "bg-[#C9A84C]/10 border-[#C9A84C]/25 text-[#C9A84C]" 
                            : "bg-[#4A7C59]/10 border-[#4A7C59]/25 text-[#4A7C59]"
                        }`}>
                          {ann.batch ? ann.batch.split(",").join(" + ") : "All Batches"}
                        </span>
                        <span className="text-[10px] text-[#8B9E6A] font-semibold font-display flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(ann.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-md text-[#0D0F12] uppercase tracking-wide truncate">{ann.title}</h3>
                      <p className="text-sm font-semibold text-gray-600 font-body whitespace-pre-wrap">{ann.message}</p>
                      {ann.link && (
                        <p className="text-xs font-semibold text-[#C9A84C] font-mono">
                          Link: {ann.link}
                        </p>
                      )}
                    </div>
                    <div className="flex md:flex-col gap-2 items-stretch justify-start flex-shrink-0">
                      <button
                        onClick={() => startEdit(ann)}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/25 px-3 py-1.5 rounded font-display font-bold uppercase tracking-wider text-xs transition"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-[#D94F3D] border border-red-100 px-3 py-1.5 rounded font-display font-bold uppercase tracking-wider text-xs transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Announcement Modal */}
        {editingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-[#0D0F12] mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#C9A84C]" /> Edit Announcement Briefing
              </h2>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                    Target Batch
                  </label>
                  <select
                    value={editBatch}
                    onChange={(e) => setEditBatch(e.target.value)}
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
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
                    Message Content
                  </label>
                  <textarea
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    rows={5}
                    className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold resize-none"
                    required
                  />
                </div>

                <div className="pt-4 border-t flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAnnouncement(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="btn-primary"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
