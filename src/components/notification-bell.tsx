"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  isRead: boolean;
}

interface NotificationBellProps {
  userType: "student" | "admin";
  userId?: string;
}

export function NotificationBell({ userType, userId }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const url = userType === "student" && userId
        ? `/api/notifications?studentId=${userId}`
        : `/api/notifications`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    if (userType === "student" && !userId) return;

    fetchNotifications();

    // Poll every 45 seconds
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [userType, userId]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read in backend
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userType === "student" ? { studentId: userId } : {})
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }

    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/mark-all-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userType === "student" ? { studentId: userId } : {})
      });

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <div className="md:relative" ref={dropdownRef}>
      {/* Bell Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 bg-[#1C2415] hover:bg-[#C9A84C] border border-[#2E3B1E] hover:border-[#C9A84C] rounded flex items-center justify-center text-[#EEF0E8] hover:text-[#0D0F12] transition duration-150 shadow cursor-pointer"
        aria-label="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 border border-[#0D0F12] text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold font-mono animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-4 md:right-0 top-14 md:top-auto md:mt-2 w-[calc(100vw-32px)] sm:w-80 bg-[#0D0F12] border border-[#2E3B1E] rounded shadow-2xl overflow-hidden z-50 text-[#EEF0E8] font-display">
          {/* Header */}
          <div className="p-3 border-b border-[#2E3B1E] flex justify-between items-center bg-[#1C2415]">
            <span className="font-bold text-xs uppercase tracking-wider text-[#EEF0E8] flex items-center gap-1.5">
              🔔 Briefing Alerts
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-[#C9A84C] hover:text-[#F0D080] font-bold uppercase tracking-wider transition flex items-center gap-1 hover:underline"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List Items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#2E3B1E] no-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8B9E6A] font-semibold uppercase tracking-wider">
                No notification briefings
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 text-left ${
                    n.isRead 
                      ? "bg-transparent hover:bg-[#1C2415]" 
                      : "bg-[#1C2415]/70 hover:bg-[#1C2415] border-l-2 border-[#C9A84C]"
                  }`}
                >
                  {/* Status Indicator Dot */}
                  {!n.isRead && (
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-[#C9A84C] flex-shrink-0 animate-pulse" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wide truncate ${n.isRead ? "text-[#EEF0E8]" : "text-[#C9A84C]"}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-[#8B9E6A] mt-1 font-body leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[9px] text-[#8B9E6A] block mt-1.5 font-mono uppercase font-semibold">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-2.5 border-t border-[#2E3B1E] bg-[#1C2415] text-center">
            <Link
              href={userType === "student" ? "/student/notifications" : "/admin/notifications"}
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#C9A84C] hover:text-[#F0D080] font-bold uppercase tracking-widest block w-full py-1.5 transition"
            >
              View All Alerts &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
