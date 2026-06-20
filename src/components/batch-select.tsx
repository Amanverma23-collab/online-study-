"use client";

import React from "react";
import { BATCH_OPTIONS } from "@/lib/batch";

interface BatchSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

/**
 * Single dropdown offering the 6 preset batch / combo options used on every
 * creation form. Stores a comma-separated string (e.g. "CDS,OTA").
 */
export function BatchSelect({
  value,
  onChange,
  label = "Batch",
  className = "",
}: BatchSelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#8B9E6A] mb-1.5">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 border border-[#DDD8CC] rounded focus:outline-none focus:ring-1 focus:ring-[#C9A84C] focus:border-[#C9A84C] text-sm font-semibold bg-white"
      >
        {BATCH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
