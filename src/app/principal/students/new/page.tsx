"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Suspense } from "react";

function NewStudentForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const { schoolId } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName:   "",
    lastName:    "",
    gender:      "M",
    dateOfBirth: "",
    classId:     params.get("classId") ?? "",
    parentName:  "",
    parentPhone: "",
    parentEmail: "",
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => (await fetch(`/api/classes?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const classes = classesData?.classes ?? [];

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.classId) {
      toast.error("First name, last name and class are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/students", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, schoolId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Student ${form.firstName} ${form.lastName} added`);
      router.push("/principal/students");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="page-title">Add Student</h1>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">First Name</label>
            <input
              required value={form.firstName}
              onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))}
              placeholder="Eric"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Last Name</label>
            <input
              required value={form.lastName}
              onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))}
              placeholder="Kamanzi"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm(p => ({ ...p, gender: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Date of Birth</label>
            <input
              type="date" value={form.dateOfBirth}
              onChange={(e) => setForm(p => ({ ...p, dateOfBirth: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Class</label>
          <select
            required value={form.classId}
            onChange={(e) => setForm(p => ({ ...p, classId: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white"
          >
            <option value="">— Select class —</option>
            {classes.map((c: Record<string,unknown>) => (
              <option key={c["id"] as string} value={c["id"] as string}>{c["name"] as string}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Parent / Guardian</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Parent Name</label>
              <input
                value={form.parentName}
                onChange={(e) => setForm(p => ({ ...p, parentName: e.target.value }))}
                placeholder="Jean Kamanzi"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Phone</label>
                <input
                  value={form.parentPhone}
                  onChange={(e) => setForm(p => ({ ...p, parentPhone: e.target.value }))}
                  placeholder="+250 788 000 000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Email (optional)</label>
                <input
                  type="email" value={form.parentEmail}
                  onChange={(e) => setForm(p => ({ ...p, parentEmail: e.target.value }))}
                  placeholder="parent@email.com"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving…" : "Add student"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400 text-sm">Loading…</div>}>
      <NewStudentForm />
    </Suspense>
  );
}
