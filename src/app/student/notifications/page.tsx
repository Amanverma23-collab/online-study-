"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Bell, ArrowLeft, Check, Calendar, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  isRead: boolean;
}

function StudentNotificationsContent() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentBatch, setStudentBatch] = useState("NDA");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const sId = localStorage.getItem("studentId");
    const sName = localStorage.getItem("studentName");
    const sBatch = localStorage.getItem("studentBatch") || "NDA";
    if (!sId || !sName) {
      router.push("/");
      return;
    }
    setStudentId(sId);
    setStudentName(sName);
    setStudentBatch(sBatch);
    fetchNotifications(sId);
  }, []);

  const fetchNotifications = async (sId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?studentId=${sId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!studentId) return;
    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });

      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error("Error marking read:", err);
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!studentId || notifications.length === 0) return;
    setActionLoading(true);
    try {
      await fetch(`/api/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "NEW_TEST":
        return { label: "Exam briefing", color: "bg-[#C9A84C]/10 border-[#C9A84C]/20 text-[#C9A84C]" };
      case "NEW_LIVE_CLASS":
        return { label: "Live class", color: "bg-[#D94F3D]/10 border-[#D94F3D]/20 text-[#D94F3D]" };
      case "NEW_RECORDED_CLASS":
        return { label: "Archive upload", color: "bg-[#2C6E8A]/10 border-[#2C6E8A]/20 text-[#2C6E8A]" };
      case "NEW_ANNOUNCEMENT":
        return { label: "Announcement", color: "bg-[#4A7C59]/10 border-[#4A7C59]/20 text-[#4A7C59]" };
      case "PURCHASE_SUCCESS":
        return { label: "Receipt", color: "bg-green-100 border-green-200 text-green-700" };
      default:
        return { label: "Alert", color: "bg-gray-100 border-gray-200 text-gray-700" };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <main className="flex-1 p-6 md:p-8 pt-14 md:pt-0 overflow-hidden h-full flex flex-col bg-[#F5F3EC]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#F5F3EC] -mx-6 md:-mx-8 px-6 md:px-8 pt-3 md:pt-6 mt-0 flex justify-between items-center gap-4 mb-6 border-b border-[#DDD8CC] pb-4 md:pb-6">
        <div className="flex items-center gap-3">
          <Link href="/student/dashboard" className="p-1 text-[#8B9E6A] hover:text-[#0D0F12] transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="page-title text-[#0D0F12] uppercase font-bold !text-xl md:!text-2xl !tracking-tight whitespace-nowrap">
              Alerts & Notifications
            </h1>
            <p className="text-xs text-[#8B9E6A] font-body mt-1">
              Review history of recent briefings, test setups, classes, and announcements.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => studentId && fetchNotifications(studentId)}
            className="p-2 border border-[#DDD8CC] bg-white text-[#8B9E6A] hover:text-[#0D0F12] rounded-[4px] shadow-sm transition"
            title="Refresh list"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-[#0D0F12] font-display font-bold uppercase tracking-wider text-xs px-3 py-2 rounded-[4px] transition flex items-center gap-1.5 shadow"
            >
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 -mx-6 md:-mx-8 px-6 md:px-8">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-16 text-center text-gray-400 shadow-sm max-w-2xl mx-auto mt-8">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-bounce" />
            <p className="font-display font-bold uppercase tracking-wider text-[#0D0F12]">No alerts deployed yet</p>
            <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Your notification briefing log is clean.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {notifications.map((n) => {
              const badge = getTypeBadge(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group bg-white rounded-[6px] border shadow-sm p-5 transition duration-150 cursor-pointer flex gap-4 items-start ${
                    n.isRead 
                      ? "border-[#DDD8CC] opacity-90 hover:opacity-100 hover:border-gray-400" 
                      : "border-[#C9A84C] ring-1 ring-[#C9A84C]/10 bg-white hover:border-[#C9A84C]"
                  }`}
                >
                  {/* Unread Status Gold Indicator */}
                  {!n.isRead && (
                    <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-[#C9A84C] flex-shrink-0 animate-pulse" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-2 flex-wrap sm:flex-nowrap">
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-display font-bold uppercase tracking-wider border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-[#8B9E6A] font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(n.createdAt)}
                      </span>
                    </div>

                    <h3 className={`font-display font-bold text-md uppercase group-hover:text-[#C9A84C] transition duration-100 ${
                      n.isRead ? "text-[#0D0F12]" : "text-[#C9A84C]"
                    }`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-[#8B9E6A] font-semibold font-body leading-relaxed mt-1.5">
                      {n.message}
                    </p>
                    
                    {n.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-[#C9A84C] mt-3 group-hover:underline">
                        Navigate to panel <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function StudentNotificationsPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#F5F3EC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
      </div>
    }>
      <StudentNotificationsContent />
    </Suspense>
  );
}
