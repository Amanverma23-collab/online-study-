"use client";

import React, { Suspense } from "react";
import { usePathname } from "next/navigation";
import { StudentSidebar } from "@/components/student-sidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide the sidebar during test-taking or detailed results review to ensure distraction-free layout
  const isTestOrResult = pathname.includes("/test/") || pathname.includes("/result/");

  if (isTestOrResult) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#0D0F12]">
      <Suspense fallback={
        <div className="w-[220px] bg-[#0D0F12] h-full animate-pulse" />
      }>
        <StudentSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {children}
      </div>
    </div>
  );
}
