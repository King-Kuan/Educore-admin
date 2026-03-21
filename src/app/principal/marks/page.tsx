"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";
import toast from "react-hot-toast";
import { Save, Lock, Unlock, AlertCircle } from "lucide-react";

interface MarkEntry {
  studentId:  string;
  subjectId:  string;
  caScore:    number | "";
  examScore:  number | "";
  totalScore: number;
  percentage: number;
  grade:      string;
  isLocked:   boolean;
}

export default function MarksPage() {
  const { schoolId, isPrincipal } = useAuthStore();
  const qc = useQueryClient();
  const [selectedClass,   setSelectedClass]   = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [term,            setTerm]            = useState(getCurrentTerm());
  const [year,            setYear]            = useState(getCurrentAcademicYear());
  const [markEntries,     setMarkEntries]     = useState<Record<string, MarkEntry>>({});
  const [saving,          setSaving]          = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => (await fetch(`/api/classes?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects", schoolId, selectedClass],
    queryFn:  async () => {
      if (!selectedClass) return { subjects: [] };
      const res = await fetch(`/api/subjects?schoolId=${schoolId}&classId=${selectedClass}`);
      return res.json();
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students", schoolId, selectedClass],
    queryFn:  async () => {
      if (!selectedClass) return { students: [] };
      return (await fetch(`/api/students?schoolId=${schoolId}&classId=${selectedClass}`)).json();
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: marksData } = useQuery({
    queryKey: ["marks", schoolId, selectedClass, selectedSubject, term, year],
    queryFn:  async () => {
      if (!selectedClass || !selectedSubject) return { marks: [] };
      const params = new URLSearchParams({ schoolId: schoolId!, classId: selectedClass, term: String(term), academicYear: year });
      return (await fetch(`/api/marks?${params}`)).json();
    },
    enabled: !!schoolId && !!selectedClass && !!selectedSubject,
  });

  const classes  = classesData?.classes  ?? [];
  const subjects = subjectsData?.subjects ?? [];
  const students = studentsData?.students ?? [];
  const marks    = marksData?.marks?.filter((m: Record<string, unknown>) => m["subjectId"] === selectedSubject) ?? [];

  const selectedSubjectData = subjects.find((s: Record<string, unknown>) => s["id"] === selectedSubject);

  // Pre-fill entries from existing marks
  useEffect(() => {
    const entries: Record<string, MarkEntry> = {};
    students.forEach((stu: Record<string, unknown>) => {
      const existing = marks.find((m: Record<string, unknown>) => m["studentId"] === stu["id"]);
      entries[stu["id"] as string] = {
        studentId:  stu["id"] as string,
        subjectId:  selectedSubject,
        caScore:    existing ? (existing["caScore"] as number) : "",
        examScore:  existing ? (existing["examScore"] as number) : "",
        totalScore: existing ? (existing["totalScore"] as number) : 0,
        percentage: existing ? (existing["percentage"] as number) : 0,
        grade:      existing ? (existing["grade"] as string) : "",
        isLocked:   existing ? (existing["isLocked"] as boolean) : false,
      };
    });
    setMarkEntries(entries);
  }, [students, marks, selectedSubject]);

  const updateScore = (studentId: string, field: "caScore" | "examScore", value: string) => {
    const num = value === "" ? "" : parseFloat(value);
    const entry     = markEntries[studentId];
    if (!entry || !selectedSubjectData) return;

    const ca    = field === "caScore"   ? (num === "" ? 0 : num) : (entry.caScore   === "" ? 0 : entry.caScore as number);
    const exam  = field === "examScore" ? (num === "" ? 0 : num) : (entry.examScore === "" ? 0 : entry.examScore as number);
    const total = ca + exam;
    const max   = (selectedSubjectData["caMax"] as number + selectedSubjectData["examMax"] as number);
    const pct   = max > 0 ? parseFloat(((total / max) * 100).toFixed(2)) : 0;
    const grade = pct >= 80 ? "A" : pct >= 75 ? "B" : pct >= 70 ? "C" : pct >= 65 ? "D" : pct >= 60 ? "E" : pct >= 50 ? "S" : "F";

    setMarkEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId]!, [field]: num, totalScore: total, percentage: pct, grade },
    }));
  };

  const saveAllMarks = async () => {
    if (!selectedClass || !selectedSubject) return;
    setSaving(true);
    const entries = Object.values(markEntries).filter((e) => !e.isLocked && (e.caScore !== "" || e.examScore !== ""));

    try {
      await Promise.all(entries.map((e) =>
        fetch("/api/marks", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            schoolId, studentId: e.studentId, subjectId: e.subjectId,
            classId: selectedClass, caScore: e.caScore === "" ? 0 : e.caScore,
            examScore: e.examScore === "" ? 0 : e.examScore, term, academicYear: year,
          }),
        })
      ));
      toast.success(`Saved ${entries.length} marks`);
      qc.invalidateQueries({ queryKey: ["marks"] });
    } catch {
      toast.error("Failed to save some marks");
    } finally {
      setSaving(false);
    }
  };

  const lockMarks = async (lock: boolean) => {
    if (!selectedClass) return;
    const res = await fetch("/api/marks", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ schoolId, classId: selectedClass, term, academicYear: year, lock }),
    });
    if (res.ok) {
      toast.success(lock ? "Marks locked" : "Marks unlocked");
      qc.invalidateQueries({ queryKey: ["marks"] });
    }
  };

  const caMax   = selectedSubjectData?.["caMax"]   as number ?? 0;
  const examMax = selectedSubjectData?.["examMax"] as number ?? 0;
  const anyLocked = Object.values(markEntries).some((e) => e.isLocked);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marks Entry</h1>
          <p className="text-sm text-gray-500 mt-0.5">Enter CA and exam scores per subject</p>
        </div>
        <div className="flex gap-2">
          {isPrincipal && selectedClass && (
            <>
              <button
                onClick={() => lockMarks(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-amber-300 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100"
              >
                <Unlock className="w-4 h-4" /> Unlock
              </button>
              <button
                onClick={() => lockMarks(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-red-300 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
              >
                <Lock className="w-4 h-4" /> Lock Marks
              </button>
            </>
          )}
          <button
            onClick={saveAllMarks}
            disabled={saving || !selectedSubject}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save marks"}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Class</label>
          <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(""); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white">
            <option value="">— Class —</option>
            {classes.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white"
            disabled={!selectedClass}>
            <option value="">— Subject —</option>
            {subjects.map((s: { id: string; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Term</label>
          <select value={term} onChange={(e) => setTerm(parseInt(e.target.value) as 1 | 2 | 3)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white">
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Year</label>
          <input value={year} onChange={(e) => setYear(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600"
            placeholder="2025-2026" />
        </div>
      </div>

      {/* Subject info */}
      {selectedSubjectData && (
        <div className="flex items-center gap-4 px-4 py-3 bg-brand-50 border border-brand-100 rounded-lg text-sm">
          <span className="font-medium text-brand-800">{selectedSubjectData["name"] as string}</span>
          <span className="text-brand-600 font-mono">CA: {caMax} pts</span>
          <span className="text-brand-600 font-mono">Exam: {examMax} pts</span>
          <span className="text-brand-600 font-mono">Total: {caMax + examMax} pts</span>
          {anyLocked && (
            <span className="flex items-center gap-1 text-amber-700 ml-auto">
              <AlertCircle className="w-4 h-4" /> Some marks are locked
            </span>
          )}
        </div>
      )}

      {/* Marks table */}
      {selectedSubject && students.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Student</th>
                  <th>Reg. Number</th>
                  <th>CA <span className="font-normal text-gray-400">/{caMax}</span></th>
                  <th>Exam <span className="font-normal text-gray-400">/{examMax}</span></th>
                  <th>Total <span className="font-normal text-gray-400">/{caMax + examMax}</span></th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu: Record<string, unknown>, idx: number) => {
                  const entry = markEntries[stu["id"] as string];
                  if (!entry) return null;
                  return (
                    <tr key={stu["id"] as string} className={entry.isLocked ? "bg-gray-50 opacity-75" : ""}>
                      <td className="text-gray-400 text-xs font-mono">{idx + 1}</td>
                      <td className="font-medium">{stu["fullName"] as string}</td>
                      <td><span className="font-mono text-xs text-gray-400">{stu["registrationNumber"] as string}</span></td>
                      <td>
                        <input
                          type="number" min={0} max={caMax} step={0.5}
                          value={entry.caScore}
                          onChange={(e) => updateScore(stu["id"] as string, "caScore", e.target.value)}
                          disabled={entry.isLocked}
                          className="w-20 px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:ring-2 focus:ring-brand-600 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td>
                        <input
                          type="number" min={0} max={examMax} step={0.5}
                          value={entry.examScore}
                          onChange={(e) => updateScore(stu["id"] as string, "examScore", e.target.value)}
                          disabled={entry.isLocked}
                          className="w-20 px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:ring-2 focus:ring-brand-600 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td>
                        <span className="font-mono text-sm font-bold">
                          {entry.caScore !== "" || entry.examScore !== "" ? entry.totalScore : "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`font-mono text-sm ${entry.percentage >= 50 ? "text-green-600" : entry.percentage > 0 ? "text-red-600" : "text-gray-400"}`}>
                          {entry.caScore !== "" || entry.examScore !== "" ? `${entry.percentage.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                      <td>
                        {entry.grade
                          ? <span className={`grade-${entry.grade.toLowerCase()}`}>{entry.grade}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td>
                        {entry.isLocked
                          ? <span className="badge badge-red"><Lock className="w-3 h-3" /> Locked</span>
                          : <span className="badge badge-green">Open</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedClass && !selectedSubject && (
        <div className="card p-12 text-center text-gray-400 text-sm">
          Select a subject to enter marks
        </div>
      )}
    </div>
  );
}
