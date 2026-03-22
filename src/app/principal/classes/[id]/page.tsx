"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { ArrowLeft, Users, BookOpen, UserCheck, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function ClassDetailPage() {
  const params   = useParams();
  const id       = params.id as string;
  const router   = useRouter();
  const qc       = useQueryClient();
  const { schoolId } = useAuthStore();
  const [addingSubject, setAddingSubject]   = useState(false);
  const [subjectForm, setSubjectForm]       = useState({ name: "", caMax: 30, examMax: 70 });

  const { data: cls, isLoading } = useQuery({
    queryKey: ["class", id],
    queryFn:  async () => {
      const res = await fetch(`/api/classes/${id}?schoolId=${schoolId}`);
      if (!res.ok) throw new Error("Class not found");
      return res.json();
    },
    enabled: !!schoolId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students", schoolId, id],
    queryFn:  async () => {
      const res = await fetch(`/api/students?schoolId=${schoolId}&classId=${id}`);
      return res.json();
    },
    enabled: !!schoolId,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects", schoolId, cls?.levelId],
    queryFn:  async () => {
      if (!cls?.levelId) return { subjects: [] };
      const res = await fetch(`/api/subjects?schoolId=${schoolId}&levelId=${cls.levelId}`);
      return res.json();
    },
    enabled: !!schoolId && !!cls?.levelId,
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn:  async () => (await fetch(`/api/teachers?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const addSubjectMutation = useMutation({
    mutationFn: async (subject: typeof subjectForm) => {
      const res = await fetch("/api/subjects", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ schoolId, levelId: cls?.levelId, ...subject }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      toast.success("Subject added");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["subjects", schoolId, cls?.levelId] });
      setSubjectForm({ name: "", caMax: 30, examMax: 70 });
      setAddingSubject(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const students = studentsData?.students ?? [];
  const subjects = subjectsData?.subjects ?? [];
  const teachers = teachersData?.teachers ?? [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{cls?.name ?? "Class"}</h1>
          <p className="text-sm text-gray-500">
            {cls?.classTeacherName ? `Class teacher: ${cls.classTeacherName}` : "No class teacher assigned"}
          </p>
        </div>
        <a
          href={`/principal/students?classId=${id}`}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
        >
          <Users className="w-4 h-4" /> View students
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Students",  value: students.length,  icon: <Users className="w-5 h-5" />,    color: "bg-brand-600"   },
          { label: "Subjects",  value: subjects.length,  icon: <BookOpen className="w-5 h-5" />, color: "bg-blue-600"    },
          { label: "Teachers",  value: (cls?.teacherIds as string[])?.length ?? 0, icon: <UserCheck className="w-5 h-5" />, color: "bg-violet-600" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`${s.color} w-9 h-9 rounded-lg flex items-center justify-center text-white mb-3`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Subjects for this level */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Subjects</h2>
          <button
            onClick={() => setAddingSubject(true)}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add subject
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No subjects for this level yet. Add subjects to start entering marks.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th className="text-center">CA Max</th>
                <th className="text-center">Exam Max</th>
                <th className="text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s: Record<string, unknown>) => (
                <tr key={s["id"] as string}>
                  <td className="font-medium">{s["name"] as string}</td>
                  <td className="text-center font-mono text-sm">{s["caMax"] as number}</td>
                  <td className="text-center font-mono text-sm">{s["examMax"] as number}</td>
                  <td className="text-center font-mono text-sm font-bold">
                    {(s["caMax"] as number) + (s["examMax"] as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Teachers assigned */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Assigned Teachers</h2>
        </div>
        {!(cls?.teacherIds as string[])?.length ? (
          <div className="p-8 text-center text-gray-400 text-sm">No teachers assigned yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(cls?.teacherIds as string[]).map((uid: string) => {
              const teacher = teachers.find((t: Record<string,unknown>) => t["uid"] === uid);
              return (
                <div key={uid} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-bold text-xs">
                    {String(teacher?.["displayName"] ?? "T").charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {teacher?.["displayName"] as string ?? uid}
                    </div>
                    <div className="text-xs text-gray-400">{teacher?.["email"] as string ?? ""}</div>
                  </div>
                  {uid === cls?.classTeacherId && (
                    <span className="ml-auto badge badge-green text-xs">Class Teacher</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add subject modal */}
      {addingSubject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Add Subject</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Subject Name</label>
                <input
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Mathematics, English"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">CA Max</label>
                  <input
                    type="number" min={0} max={100}
                    value={subjectForm.caMax}
                    onChange={(e) => setSubjectForm(p => ({ ...p, caMax: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Exam Max</label>
                  <input
                    type="number" min={0} max={100}
                    value={subjectForm.examMax}
                    onChange={(e) => setSubjectForm(p => ({ ...p, examMax: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">Total: {subjectForm.caMax + subjectForm.examMax} marks</p>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAddingSubject(false)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => addSubjectMutation.mutate(subjectForm)}
                disabled={!subjectForm.name || addSubjectMutation.isPending}
                className="px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
                {addSubjectMutation.isPending ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
