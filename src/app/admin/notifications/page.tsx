"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Bell, Check, Calendar, ExternalLink, RefreshCw } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  isRead: boolean;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications`);
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
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
    if (notifications.length === 0) return;
    setActionLoading(true);
    try {
      await fetch(`/api/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
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
      case "NEW_STUDENT":
        return { label: "New registration", color: "bg-[#4A7C59]/10 border-[#4A7C59]/20 text-[#4A7C59]" };
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
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-14 md:top-0 z-30 bg-[#F5F3EC] -mx-8 px-8 pt-0 md:pt-4 mt-0 md:-mt-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-[#DDD8CC] pb-6 flex-shrink-0">
          <div>
            <h1 className="page-title text-[#0D0F12]">Briefing Alerts Log</h1>
            <p className="text-sm text-[#8B9E6A] font-body mt-1">Review student registrations and admin-specific activity alerts.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchNotifications}
              className="p-2.5 border border-[#DDD8CC] bg-white text-[#8B9E6A] hover:text-[#0D0F12] rounded-[6px] shadow-sm transition"
              title="Refresh list"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                disabled={actionLoading}
                className="btn-primary max-w-max flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-[6px] border border-[#DDD8CC] p-16 text-center text-gray-400 shadow-sm max-w-2xl mx-auto mt-8">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-display font-bold uppercase tracking-wider text-[#0D0F12]">No alerts received</p>
              <p className="text-xs text-[#8B9E6A] font-semibold mt-1">Your administrator activity log is clean.</p>
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
                    {!n.isRead && (
                      <span className="w-2.5 h-2.5 mt-1.5 rounded-full bg-[#C9A84C] flex-shrink-0 animate-pulse" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-2">
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
                          View details <ExternalLink className="w-3 h-3" />
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
    </div>
  );
}
