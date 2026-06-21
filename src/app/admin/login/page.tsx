"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    let redirectUrl = "/?view=teacher";
    
    if (search) {
      // If search params exist, parse them and merge or append
      const params = new URLSearchParams(search);
      params.set("view", "teacher");
      redirectUrl = `/?${params.toString()}`;
    }
    
    router.replace(redirectUrl);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12]">
      <div className="text-[#EEF0E8] font-display font-semibold uppercase tracking-wider text-xs animate-pulse">
        Redirecting to secure access portal...
      </div>
    </div>
  );
}
