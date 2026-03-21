import React from "react";

export function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-green-50  text-green-800  border-green-200",
    B: "bg-blue-50   text-blue-800   border-blue-200",
    C: "bg-lime-50   text-lime-800   border-lime-200",
    D: "bg-yellow-50 text-yellow-800 border-yellow-200",
    E: "bg-orange-50 text-orange-800 border-orange-200",
    S: "bg-amber-50  text-amber-800  border-amber-200",
    F: "bg-red-50    text-red-800    border-red-200",
  };
  return (
    <span className={`inline-block font-mono text-xs px-2 py-0.5 rounded border font-medium ${styles[grade] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
      {grade}
    </span>
  );
}

export function Badge({ color = "gray", children }: { color?: "green"|"red"|"blue"|"amber"|"gray"; children: React.ReactNode }) {
  const styles = {
    green: "bg-green-50 text-green-700 border-green-200",
    red:   "bg-red-50   text-red-700   border-red-200",
    blue:  "bg-blue-50  text-blue-700  border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gray:  "bg-gray-100 text-gray-600  border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded border ${styles[color]}`}>
      {children}
    </span>
  );
}

export function Spinner({ size = "md" }: { size?: "sm"|"md"|"lg" }) {
  const sz = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };
  return (
    <svg className={`animate-spin text-brand-600 ${sz[size]}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
