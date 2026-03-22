"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Bell, Search } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/superadmin":           "Overview",
  "/superadmin/schools":   "Schools",
  "/superadmin/users":     "Users",
  "/superadmin/billing":   "Billing",
  "/superadmin/ads":       "Advertisements",
  "/principal":            "Overview",
  "/principal/classes":    "Classes",
  "/principal/students":   "Students",
  "/principal/teachers":   "Teachers",
  "/principal/timetable":  "Timetable",
  "/principal/marks":      "Marks",
  "/principal/reports":    "Reports",
  "/principal/files":      "Files",
  "/principal/settings":   "Settings",
};

export function Header() {
  const pathname = usePathname();
  const { profile, isSuperAdmin } = useAuthStore();

  // Match longest prefix
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([path]) => pathname.startsWith(path))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Dashboard";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: page title */}
      <div className="flex items-center gap-3">
        {/* Rwanda flag micro stripe */}
        <div className="flex h-5 w-1 rounded-full overflow-hidden flex-col">
          <div className="flex-[2] bg-rw-green" />
          <div className="flex-1 bg-rw-yellow" />
          <div className="flex-1 bg-rw-blue" />
        </div>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search…"
            className="
              pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md
              w-48 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent
              placeholder:text-gray-400
            "
          />
        </div>

        <button className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {profile?.displayName?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium text-gray-700 leading-none">
              {profile?.displayName ?? "User"}
            </div>
            <div className="text-[10px] text-gray-400 font-mono capitalize leading-none mt-0.5">
              {isSuperAdmin ? "superadmin" : "principal"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
