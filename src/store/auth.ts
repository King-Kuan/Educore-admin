"use client";
import { create } from "zustand";
import type { User } from "firebase/auth";
import type { AppUser, UserRole } from "@/lib/types";

interface AuthState {
  user: User | null; profile: AppUser | null; claims: { role: UserRole; schoolId: string | null; permissions: string[] } | null;
  loading: boolean; role: UserRole | null; schoolId: string | null; permissions: string[];
  isSuperAdmin: boolean; isPrincipal: boolean; isDeputy: boolean; isTeacher: boolean;
  setUser: (u: User | null) => void;
  setProfile: (p: AppUser | null, c: { role: UserRole; schoolId: string | null; permissions: string[] } | null) => void;
  setLoading: (v: boolean) => void;
  hasPermission: (perm: string) => boolean;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, profile: null, claims: null, loading: true,
  role: null, schoolId: null, permissions: [],
  isSuperAdmin: false, isPrincipal: false, isDeputy: false, isTeacher: false,
  setUser: (user) => set({ user }),
  setProfile: (profile, claims) => {
    const role = claims?.role ?? null;
    set({ profile, claims, role, schoolId: claims?.schoolId ?? null, permissions: claims?.permissions ?? [],
      isSuperAdmin: role === "superadmin", isPrincipal: role === "principal",
      isDeputy: role === "deputy", isTeacher: role === "teacher" });
  },
  setLoading: (loading) => set({ loading }),
  hasPermission: (perm) => {
    const { role, permissions } = get();
    if (role === "superadmin" || role === "principal") return true;
    return permissions.includes(perm);
  },
  reset: () => set({ user: null, profile: null, claims: null, loading: false, role: null, schoolId: null, permissions: [], isSuperAdmin: false, isPrincipal: false, isDeputy: false, isTeacher: false }),
}));
