"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "@/lib/firebase/auth";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Mail, BookOpen } from "lucide-react";

const schema = z.object({
  email:    z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const user = await signIn(data.email, data.password);
      const token = await user.getIdToken();
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const { getUserClaims } = await import("@/lib/firebase/auth");
      const claims   = await getUserClaims(user);
      const userRole = claims?.role ?? "principal";
      const dest     = redirect !== "/" ? redirect : getDashboard(userRole);
      router.push(dest);
      toast.success("Welcome back!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        toast.error("Incorrect email or password");
      } else if (msg.includes("too-many-requests")) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="fixed top-0 left-0 right-0 h-1 flex z-50">
        <div className="flex-[2]" style={{ background: "#20603D" }} />
        <div className="flex-1"  style={{ background: "#FAD201" }} />
        <div className="flex-1"  style={{ background: "#00A1DE" }} />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 shadow-lg" style={{ background: "#1a3a2a" }}>
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">EduCore RW</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono tracking-wide">School Management Platform</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.rw"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-md border focus:outline-none focus:ring-2 focus:border-transparent ${errors.email ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
                />
              </div>
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-md border focus:outline-none focus:ring-2 focus:border-transparent ${errors.password ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-white text-sm font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              style={{ background: "#1a3a2a" }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 font-mono">
          Republic of Rwanda · Ministry of Education aligned
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function getDashboard(role: string): string {
  if (role === "superadmin") return "/superadmin";
  if (role === "principal")  return "/principal";
  if (role === "deputy")     return "/deputy";
  return "/login";
}
