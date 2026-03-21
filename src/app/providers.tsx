"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { onAuthChange, getUserProfile, getUserClaims } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const [profile, claims] = await Promise.all([
            getUserProfile(firebaseUser.uid),
            getUserClaims(firebaseUser),
          ]);
          setProfile(profile, claims);
        } catch (err) {
          console.error("Failed to load user profile:", err);
        }
      } else {
        setUser(null);
        setProfile(null, null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
