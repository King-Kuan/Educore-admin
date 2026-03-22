"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { signOut } from "@/lib/firebase/auth";
import {
  LayoutDashboard, School, Users, CreditCard, Megaphone,
  GraduationCap, BookOpen, UserCheck, Calendar, BarChart3,
  FileText, FolderOpen, LogOut, ChevronRight, BookMarked,
  Settings, ShieldCheck,
} from "lucide-react";

interface NavItem {
  label: string;
  href:  string;
  icon:  React.ReactNode;
  permission?: string;
}

const SUPERADMIN_NAV: NavItem[] = [
  { label: "Dashboard",  href: "/superadmin",          icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Schools",    href: "/superadmin/schools",   icon: <School className="w-4 h-4" /> },
  { label: "Users",      href: "/superadmin/users",     icon: <Users className="w-4 h-4" /> },
  { label: "Billing",    href: "/superadmin/billing",   icon: <CreditCard className="w-4 h-4" /> },
  { label: "Ads",        href: "/superadmin/ads",       icon: <Megaphone className="w-4 h-4" /> },
];

const PRINCIPAL_NAV: NavItem[] = [
  { label: "Dashboard",  href: "/principal",            icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Classes",    href: "/principal/classes",    icon: <GraduationCap className="w-4 h-4" /> },
  { label: "Students",   href: "/principal/students",   icon: <BookMarked className="w-4 h-4" /> },
  { label: "Promote",    href: "/principal/students/promote", icon: <GraduationCap className="w-4 h-4" /> },
  { label: "Teachers",   href: "/principal/teachers",   icon: <UserCheck className="w-4 h-4" /> },
  { label: "Timetable",  href: "/principal/timetable",  icon: <Calendar className="w-4 h-4" /> },
  { label: "Marks",      href: "/principal/marks",      icon: <BarChart3 className="w-4 h-4" />, permission: "view_marks" },
  { label: "Reports",    href: "/principal/reports",    icon: <FileText className="w-4 h-4" />, permission: "generate_reports" },
  { label: "Files",      href: "/principal/files",      icon: <FolderOpen className="w-4 h-4" /> },
  { label: "Settings",   href: "/principal/settings",   icon: <Settings className="w-4 h-4" /> },
];

export function Sidebar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { role, profile, isSuperAdmin, hasPermission, reset } = useAuthStore();

  const navItems = isSuperAdmin ? SUPERADMIN_NAV : PRINCIPAL_NAV;

  const handleSignOut = async () => {
    try {
      await signOut();
      await fetch("/api/auth/session", { method: "DELETE" });
      reset();
      router.push("/login");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Sign out failed");
    }
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-brand-600 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">EduCore RW</div>
            <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">
              {isSuperAdmin ? "Super Admin" : "Dashboard"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          // Check deputy permissions
          if (item.permission && !hasPermission(item.permission) && role !== "principal") {
            return null;
          }

          const isActive =
            item.href === "/principal" || item.href === "/superadmin"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all
                ${isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
                }
              `}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        {/* Role badge */}
        <div className="flex items-center gap-2 px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-white/40 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {profile?.displayName ?? "User"}
            </div>
            <div className="text-[10px] text-white/40 font-mono capitalize">
              {role}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="
            w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm
            text-white/60 hover:bg-white/8 hover:text-white transition-all
          "
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
