"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Star, FileText, LogOut, Package, Menu, X, Video } from "lucide-react";

export function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "tests";

  const [studentName, setStudentName] = useState("");
  const [studentBatch, setStudentBatch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setStudentName(localStorage.getItem("studentName") || "Candidate");
    setStudentBatch(localStorage.getItem("studentBatch") || "NDA");
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    localStorage.removeItem("studentId");
    localStorage.removeItem("studentName");
    localStorage.removeItem("studentMobile");
    localStorage.removeItem("studentBatch");
    router.push("/");
  };

  const menuItems = [
    {
      name: "Mock Tests",
      href: "/student/dashboard?tab=tests",
      icon: FileText,
      isActive: pathname === "/student/dashboard" && activeTab === "tests",
    },
    {
      name: "Paid Test Series",
      href: "/student/dashboard?tab=series",
      icon: Package,
      isActive: pathname === "/student/dashboard" && activeTab === "series",
    },
    {
      name: "Classes",
      href: "/student/classes",
      icon: Video,
      isActive: pathname === "/student/classes",
    },
  ];

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0D0F12] text-[#EEF0E8] border-b border-[#2E3B1E] flex items-center justify-between px-4 z-40">
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
        <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest bg-[#1C2415] px-2.5 py-1 rounded border border-[#2E3B1E]">
          {studentBatch} Candidate
        </span>
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
              <span className="text-[10px] text-[#8B9E6A] font-display font-semibold uppercase tracking-widest">Candidate Briefing</span>
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

        {/* Candidate Profile Details Card */}
        <div className="px-5 py-4 border-b border-[#2E3B1E] bg-[#1C2415]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center text-xs font-display font-bold text-[#C9A84C]">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-display font-bold uppercase tracking-wider text-[#EEF0E8] truncate">{studentName}</p>
              <span className="inline-block mt-0.5 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wide">
                {studentBatch} BATCH
              </span>
            </div>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-display uppercase tracking-wider transition duration-150 border-l-2 ${
                  item.isActive
                    ? "bg-[#1C2415] border-[#C9A84C] text-[#C9A84C] font-semibold"
                    : "border-transparent text-[#8B9E6A] hover:bg-[#1C2415]/50 hover:text-[#EEF0E8]"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-[#2E3B1E]">
          <button
            onClick={handleLogout}
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
