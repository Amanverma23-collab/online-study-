"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useActiveBatch } from "@/contexts/ActiveBatchContext";
import {
  ArrowLeft,
  Radio,
  Film,
  Plus,
  Trash2,
  Calendar,
  ExternalLink,
  Clock,
  FileText,
} from "lucide-react";

interface LiveClass {
  id: string;
  subject: string;
  title: string;
  details: string;
  zoomLink: string;
  classDate: string;
  batch: string;
  isEnded: boolean;
  createdAt: string;
}

interface RecordedClass {
  id: string;
  subject: string;
  className: string;
  details: string;
  youtubeLink: string;
  notesUrl: string | null;
  notesName: string | null;
  batch: string;
  createdAt: string;
}

export default function SubjectClassesPage() {
  const params = useParams();
  const router = useRouter();
  const subject = decodeURIComponent(params.subject as string);
  const { activeBatch } = useActiveBatch();

  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [recordedClasses, setRecordedClasses] = useState<RecordedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleLiveClasses = activeBatch
    ? liveClasses.filter((c) =>
        c.batch
          ? c.batch
              .split(",")
              .map((b) => b.trim())
              .includes(activeBatch)
          : false
      )
    : liveClasses;

  const visibleRecordedClasses = activeBatch
    ? recordedClasses.filter((c) =>
        c.batch
          ? c.batch
              .split(",")
              .map((b) => b.trim())
              .includes(activeBatch)
          : false
      )
    : recordedClasses;

  useEffect(() => {
    fetchClasses();
  }, [subject]);

  const fetchClasses = async () => {
    try {
      const [liveRes, recordedRes] = await Promise.all([
        fetch(`/api/admin/classes/live?subject=${encodeURIComponent(subject)}`),
        fetch(
          `/api/admin/classes/recorded?subject=${encodeURIComponent(subject)}`
        ),
      ]);
      setLiveClasses(await liveRes.json());
      setRecordedClasses(await recordedRes.json());
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndLive = async (id: string) => {
    if (!confirm("Are you sure you want to end this live class? Students will no longer be able to join.")) return;
    try {
      const res = await fetch(`/api/admin/classes/live/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnded: true }),
      });
      if (res.ok) {
        setLiveClasses((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isEnded: true } : c))
        );
      }
    } catch (err) {
      console.error("End live class failed:", err);
    }
  };

  const handleDeleteLive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this live class?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/classes/live/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLiveClasses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteRecorded = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recorded class?"))
      return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/classes/recorded/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecordedClasses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#F5F3EC] -mx-8 px-8 pt-4 -mt-8 mb-8 border-b border-[#DDD8CC] pb-6">
          <button
            onClick={() => router.push("/admin/classes")}
            className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] hover:text-[#0D0F12] transition mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Classes Hub
          </button>
          <h1 className="page-title text-[#0D0F12]">{subject}</h1>
          <p className="text-sm text-[#8B9E6A] font-body mt-1">
            Manage live sessions and recorded classes for {subject}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Two Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Live Class Card */}
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-8 shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#2C6E8A]/10 border border-[#2C6E8A]/20 rounded-full flex items-center justify-center mb-4">
                  <Radio className="w-7 h-7 text-[#2C6E8A]" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#0D0F12] uppercase tracking-wider mb-1">
                  📹 Live Class
                </h3>
                <p className="text-xs text-[#8B9E6A] font-semibold mb-6">
                  Schedule a new Zoom session
                </p>
                <Link
                  href={`/admin/classes/${encodeURIComponent(subject)}/add-live`}
                  className="btn-primary text-xs"
                >
                  <Plus className="w-4 h-4" /> Add Live Class
                </Link>
              </div>

              {/* Recorded Class Card */}
              <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-8 shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#4A7C59]/10 border border-[#4A7C59]/20 rounded-full flex items-center justify-center mb-4">
                  <Film className="w-7 h-7 text-[#4A7C59]" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#0D0F12] uppercase tracking-wider mb-1">
                  🎬 Recorded Class
                </h3>
                <p className="text-xs text-[#8B9E6A] font-semibold mb-6">
                  Upload a class recording
                </p>
                <Link
                  href={`/admin/classes/${encodeURIComponent(subject)}/add-recorded`}
                  className="btn-primary text-xs"
                >
                  <Plus className="w-4 h-4" /> Add Recording
                </Link>
              </div>
            </div>

            {/* Live Classes List */}
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
              <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50 rounded-t-[6px] flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[#2C6E8A]" />
                <h2 className="font-display font-bold text-md uppercase tracking-wider text-[#0D0F12]">
                  Live Classes ({visibleLiveClasses.length})
                </h2>
              </div>

              {visibleLiveClasses.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Radio className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-sm">
                    No live classes found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#DDD8CC]">
                  {visibleLiveClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-5 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-sm text-[#0D0F12] uppercase truncate flex items-center gap-2">
                          <span>{cls.title}</span>
                          {cls.batch && (
                            <span className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                              {cls.batch.split(",").join(" + ")}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#8B9E6A] font-semibold mt-1 line-clamp-2">
                          {cls.details}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs font-display font-bold uppercase tracking-wider text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(cls.classDate)}
                          </span>
                          <a
                            href={cls.zoomLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#2C6E8A] hover:text-[#C9A84C] transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Zoom Link
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        {!cls.isEnded ? (
                          <button
                            onClick={() => handleEndLive(cls.id)}
                            className="px-3 py-1.5 rounded border border-[#C9A84C]/30 hover:border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/5 text-xs font-display font-bold uppercase tracking-wider transition duration-150"
                          >
                            End Class
                          </button>
                        ) : (
                          <span className="inline-flex items-center bg-gray-100 text-gray-400 border border-gray-200 px-2.5 py-1 rounded text-xs font-display font-bold uppercase tracking-wider">
                            Ended
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteLive(cls.id)}
                          disabled={deletingId === cls.id}
                          className="p-2 rounded border border-red-100 bg-red-50 text-[#D94F3D] hover:bg-red-100 transition disabled:opacity-50"
                          title="Delete live class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recorded Classes List */}
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] shadow-sm">
              <div className="p-6 border-b border-[#DDD8CC] bg-gray-50/50 rounded-t-[6px] flex items-center gap-2.5">
                <Film className="w-4 h-4 text-[#4A7C59]" />
                <h2 className="font-display font-bold text-md uppercase tracking-wider text-[#0D0F12]">
                  Recorded Classes ({visibleRecordedClasses.length})
                </h2>
              </div>

              {visibleRecordedClasses.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Film className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-display font-semibold uppercase tracking-wider text-sm">
                    No recorded classes found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#DDD8CC]">
                  {visibleRecordedClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-5 flex items-start justify-between gap-4 hover:bg-gray-50/50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-sm text-[#0D0F12] uppercase truncate flex items-center gap-2">
                          <span>{cls.className}</span>
                          {cls.batch && (
                            <span className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                              {cls.batch.split(",").join(" + ")}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-[#8B9E6A] font-semibold mt-1 line-clamp-2">
                          {cls.details}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs font-display font-bold uppercase tracking-wider text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Added {formatDate(cls.createdAt)}
                          </span>
                          <a
                            href={cls.youtubeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#D94F3D] hover:text-[#C9A84C] transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            YouTube
                          </a>
                          {cls.notesUrl && (
                            <a
                              href={cls.notesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#4A7C59] hover:text-[#C9A84C] transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {cls.notesName || "Notes"}
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRecorded(cls.id)}
                        disabled={deletingId === cls.id}
                        className="p-2 rounded border border-red-100 bg-red-50 text-[#D94F3D] hover:bg-red-100 transition flex-shrink-0 disabled:opacity-50"
                        title="Delete recorded class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
