"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { Plus, Users, BookOpen, X, GraduationCap } from "lucide-react";

export default function ClassesPage() {
  const { schoolId }   = useAuthStore();
  const qc             = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", levelId: "", classTeacherId: "", capacity: 50 });
  const [submitting, setSubmitting] = useState(false);

  const { data: classesData, isLoading } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => (await fetch(`/api/classes?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const { data: levelsData } = useQuery({
    queryKey: ["levels", schoolId],
    queryFn:  async () => (await fetch(`/api/levels?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn:  async () => (await fetch(`/api/teachers?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const classes  = classesData?.classes  ?? [];
  const levels   = levelsData?.levels    ?? [];
  const teachers = teachersData?.teachers ?? [];

  const handleCreate = async () => {
    if (!form.name || !form.levelId) { toast.error("Name and level are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, schoolId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Class "${form.name}" created`);
      setForm({ name: "", levelId: "", classTeacherId: "", capacity: 50 });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["classes"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setSubmitting(false);
    }
  };

  // Group classes by level
  const grouped: Record<string, typeof classes> = {};
  classes.forEach((cls: Record<string, unknown>) => {
    const levelId = cls["levelId"] as string ?? "other";
    if (!grouped[levelId]) grouped[levelId] = [];
    grouped[levelId].push(cls);
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{classes.length} classes this academic year</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
          <Plus className="w-4 h-4" /> New class
        </button>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-400 text-sm">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="card p-12 text-center">
          <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <div className="text-gray-500 font-medium mb-1">No classes yet</div>
          <p className="text-xs text-gray-400">Create your first class to get started.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([levelId, levelClasses]) => {
          const level = levels.find((l: Record<string, unknown>) => l["id"] === levelId);
          return (
            <div key={levelId} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <h2 className="font-semibold text-sm text-gray-700">{level?.["name"] as string ?? "Other"}</h2>
                <span className="text-xs text-gray-400 ml-1">{levelClasses.length} classes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-200">
                {levelClasses.map((cls: Record<string, unknown>) => (
                  <a key={cls["id"] as string} href={`/principal/classes/${cls["id"] as string}`}
                    className="bg-white p-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-600">{cls["name"] as string}</h3>
                      <span className="badge badge-gray text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {cls["studentCount"] as number ?? 0}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {cls["classTeacherName"]
                        ? <span>Class teacher: <strong>{cls["classTeacherName"] as string}</strong></span>
                        : <span className="text-amber-600">No class teacher assigned</span>
                      }
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {(cls["teacherIds"] as string[])?.length ?? 0} teachers assigned
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Create new class</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. P5 A, S2 B, Nursery 2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School level</label>
                <select value={form.levelId} onChange={(e) => setForm({ ...form, levelId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white">
                  <option value="">— Select level —</option>
                  {levels.map((l: Record<string, unknown>) => (
                    <option key={l["id"] as string} value={l["id"] as string}>{l["name"] as string}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class teacher (optional)</label>
                <select value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white">
                  <option value="">— Assign later —</option>
                  {teachers.map((t: Record<string, unknown>) => (
                    <option key={t["uid"] as string} value={t["uid"] as string}>{t["displayName"] as string}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacity</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none" />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={submitting}
                  className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
                  {submitting ? "Creating…" : "Create class"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
