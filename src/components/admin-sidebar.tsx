"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Star, LayoutDashboard, PlusCircle, FileText, LogOut, Users, Package, Menu, X, Video, Megaphone } from "lucide-react";
import { SINGLE_BATCHES, type SingleBatch } from "@/lib/batch";
import { useActiveBatch } from "@/contexts/ActiveBatchContext";
import { NotificationBell } from "./notification-bell";

export function AdminSidebar() {
  const pathname = usePathname();
  const [hasNewCadets, setHasNewCadets] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { activeBatch, setActiveBatch } = useActiveBatch();

  const handleBatchChange = (batch: SingleBatch | null) => {
    if (activeBatch === batch) {
      setActiveBatch(null);
    } else {
      setActiveBatch(batch);
    }
  };

  useEffect(() => {
    const checkNewCadets = async () => {
      try {
        const lastChecked = localStorage.getItem("cadetsLastChecked") || "";
        const res = await fetch(`/api/admin/cadets/new?since=${lastChecked}`);
        const data = await res.json();
        setHasNewCadets(data.count > 0);
      } catch {
        setHasNewCadets(false);
      }
    };

    checkNewCadets();
    const interval = setInterval(checkNewCadets, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCadetsClick = () => {
    localStorage.setItem("cadetsLastChecked", new Date().toISOString());
    setHasNewCadets(false);
  };

  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Create Test", href: "/admin/create-test", icon: PlusCircle },
    { name: "My Tests", href: "/admin/tests", icon: FileText },
    { name: "Test Series", href: "/admin/test-series", icon: Package },
    { name: "Classes", href: "/admin/classes", icon: Video },
    { name: "Cadets", href: "/admin/cadets", icon: Users, showDot: true },
    { name: "Announcements", href: "/admin/announcements", icon: Megaphone }
  ];

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0D0F12] text-[#EEF0E8] border-b border-[#2E3B1E] flex items-center justify-between px-4 z-45">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="w-8 h-8 bg-[#C9A84C] rounded flex items-center justify-center text-[#0D0F12] shadow hover:bg-[#F0D080] transition"
            aria-label="Open Sidebar"
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
          <span className="font-display font-bold text-md tracking-wider uppercase">Officers Saga</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell userType="admin" />
          <label className="flex items-center gap-1.5 bg-[#1C2415] px-2.5 py-1 rounded border border-[#2E3B1E]">
            <span className="text-[9px] text-[#8B9E6A] font-display font-bold uppercase tracking-widest">Batch</span>
            <select
              value={activeBatch || ""}
              onChange={(e) => handleBatchChange((e.target.value || null) as SingleBatch | null)}
              className="bg-transparent text-[#C9A84C] text-[11px] font-display font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
              aria-label="Active Batch"
            >
              <option value="" className="bg-[#0D0F12] text-[#EEF0E8]">
                ALL
              </option>
              {SINGLE_BATCHES.map((b) => (
                <option key={b} value={b} className="bg-[#0D0F12] text-[#EEF0E8]">
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar aside panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-[#0D0F12] text-[#EEF0E8] h-full flex flex-col border-r border-[#2E3B1E] transition-transform duration-300 transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:w-[220px] md:flex-shrink-0 md:flex`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#2E3B1E] flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#C9A84C] rounded flex items-center justify-center text-[#0D0F12] shadow">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="font-display font-bold text-md tracking-wider text-[#EEF0E8] uppercase">Officers Saga</h2>
              <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest">Breifing Room</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 text-[#8B9E6A] hover:text-[#EEF0E8] transition"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Batch switcher — drives default pre-fill on creation forms */}
        <div className="px-5 py-4 border-b border-[#2E3B1E] bg-[#1C2415]/40">
          <label className="block text-[10px] text-[#8B9E6A] font-display font-bold uppercase tracking-widest mb-1.5">
            Active Batch
          </label>
          <div className="flex gap-1.5">
            {SINGLE_BATCHES.map((b) => (
              <button
                key={b}
                onClick={() => handleBatchChange(b)}
                className={`flex-1 py-2 rounded text-xs font-display font-bold uppercase tracking-wider transition border ${
                  activeBatch === b
                    ? "bg-[#C9A84C] border-[#C9A84C] text-[#0D0F12]"
                    : "bg-transparent border-[#2E3B1E] text-[#8B9E6A] hover:text-[#EEF0E8] hover:border-[#C9A84C]/40"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const showGreenDot = item.showDot && hasNewCadets;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  setIsOpen(false);
                  if (item.name === "Cadets") {
                    handleCadetsClick();
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-display uppercase tracking-wider transition duration-150 border-l-2 ${
                  isActive
                    ? "bg-[#1C2415] border-[#C9A84C] text-[#C9A84C] font-semibold"
                    : "border-transparent text-[#8B9E6A] hover:bg-[#1C2415]/50 hover:text-[#EEF0E8]"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
                {showGreenDot && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A7C59] animate-pulse flex-shrink-0"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-[#2E3B1E]">
          <button
            onClick={() => {
              setIsOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#8B9E6A] hover:bg-red-950/40 hover:text-[#D94F3D] rounded transition duration-150 text-left font-display text-sm uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
