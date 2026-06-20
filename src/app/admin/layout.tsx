import React from "react";
import { ActiveBatchProvider } from "@/contexts/ActiveBatchContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ActiveBatchProvider>{children}</ActiveBatchProvider>;
}
