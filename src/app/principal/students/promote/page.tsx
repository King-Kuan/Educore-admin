"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";
import toast from "react-hot-toast";
import {
  GraduationCap, ArrowRight, CheckCircle2,
  RotateCcw, XCircle, AlertCircle, ChevronDown,
} from "lucide-react";

type Decision = "promoted" | "repeat" | "second_sitting" | "discontinued";

interface StudentPromotion {
  studentId:    string;
  fullName:     string;
  studentCode:  string;
  classId:      string;
  className:    string;
  percentage:   number;
  autoDecision: Decision;
  decision:     Decision;
  toClassId:    string;
}

const DECISION_CONFIG = {
  promoted:      { label: "Promoted",        color: "bg-green-50 text-green-700 border-green-200",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  repeat:        { label: "Repeat",           color: "bg-amber-50 text-amber-700 border-amber-200", icon: <RotateCcw    className="w-3.5 h-3.5" /> },
  second_sitting:{ label: "2nd Sitting",      color: "bg-blue-50  text-blue-700  border-blue-200",  icon: <AlertCircle  className="w-3.5 h-3.5" /> },
  discontinued:  { label: "Discontinued",     color: "bg-red-50   text-red-700   border-red-200",   icon: <XCircle      className="w-3.5 h-3.5" /> },
};

function getNextYear(year: string): string {
  const parts = year.split("-");
  if (parts.length !== 2) return year;
  const y = parseInt(parts[1]!);
  return `${y}-${y + 1}`;
}

export default function PromotePage() {
  const { schoolId }     = useAuthStore();
  const currentYear      = getCurrentAcademicYear();
  const nextYear         = getNextYear(currentYear);
  const [selectedClass, setSelectedClass]   = useState("");
  const [promotions, setPromotions]         = useState<StudentPromotion[]>([]);
  const [loaded, setLoaded]                 = useState(false);
  const [loading, setLoading]               = useState(false);
  const [done, setDone]                     = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => (await fetch(`/api/classes?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const classes = classesData?.classes ?? [];

  const loadStudents = async () => {
    if (!selectedClass) { toast.error("Select a class"); return; }
    setLoading(true);
    try {
      // Get students in class
      const studentsRes = await fetch(`/api/students?schoolId=${schoolId}&classId=${selectedClass}`);
      const studentsData = await studentsRes.json();
      const students = studentsData.students ?? [];

      if (students.length === 0) {
        toast.error("No students in this class");
        setLoading(false);
        return;
      }

      // Get annual marks for each student
      const marksRes = await fetch(
        `/api/reports/generate`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            schoolId, classId: selectedClass,
            term: "annual", academicYear: currentYear,
          }),
        }
      );

      const marksData = marksRes.ok ? await marksRes.json() : null;
      const cls = classes.find((c: Record<string,unknown>) => c["id"] === selectedClass);

      const rows: StudentPromotion[] = students.map((stu: Record<string,unknown>) => {
        const annualReport = marksData?.students?.find(
          (s: Record<string,unknown>) => s["student"]?.["id"] === stu["id"] || s["studentId"] === stu["id"]
        );

        const pct           = (annualReport?.annualPercentage as number) ?? 0;
        const autoDecision  = pct >= 50 ? "promoted" : pct >= 40 ? "second_sitting" : "repeat";

        return {
          studentId:    stu["id"] as string,
          fullName:     stu["fullName"] as string,
          studentCode:  stu["studentCode"] as string,
          classId:      selectedClass,
          className:    cls?.["name"] as string ?? "",
          percentage:   pct,
          autoDecision: autoDecision as Decision,
          decision:     autoDecision as Decision,
          toClassId:    "",
        };
      });

      setPromotions(rows);
      setLoaded(true);
    } catch (err) {
      toast.error("Failed to load students");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateDecision = (studentId: string, decision: Decision) => {
    setPromotions(prev =>
      prev.map(p => p.studentId === studentId ? { ...p, decision } : p)
    );
  };

  const updateToClass = (studentId: string, toClassId: string) => {
    setPromotions(prev =>
      prev.map(p => p.studentId === studentId ? { ...p, toClassId } : p)
    );
  };

  const promoteMutation = useMutation({
    mutationFn: async () => {
      // Validate promoted students have a target class
      const invalid = promotions.filter(p => p.decision === "promoted" && !p.toClassId);
      if (invalid.length > 0) {
        throw new Error(`${invalid.length} promoted students need a target class assigned`);
      }

      const res = await fetch("/api/students/promote", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          schoolId,
          fromYear: currentYear,
          toYear:   nextYear,
          promotions: promotions.map(p => ({
            studentId: p.studentId,
            decision:  p.decision,
            toClassId: p.decision === "promoted" ? p.toClassId : p.classId,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Promotion failed");
      return json;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const summary = {
    promoted:       promotions.filter(p => p.decision === "promoted").length,
    repeat:         promotions.filter(p => p.decision === "repeat").length,
    secondSitting:  promotions.filter(p => p.decision === "second_sitting").length,
    discontinued:   promotions.filter(p => p.decision === "discontinued").length,
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Promotion Complete</h2>
        <p className="text-gray-500 mb-6">
          {summary.promoted} students moved to {nextYear}. Records updated.
        </p>
        <div className="flex gap-3">
          <a href="/principal/students"
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700">
            View Students
          </a>
          <button onClick={() => { setDone(false); setLoaded(false); setPromotions([]); setSelectedClass(""); }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
            Promote another class
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">End of Year Promotion</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentYear} → {nextYear}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Before promoting:</strong> Make sure annual reports have been generated and marks are locked for all 3 terms.
          Promotion updates each student's class and academic year permanently.
        </div>
      </div>

      {/* Class selector */}
      <div className="card p-5 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Select Class to Promote</label>
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setLoaded(false); setPromotions([]); }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none"
          >
            <option value="">— Select class —</option>
            {classes.map((c: Record<string,unknown>) => (
              <option key={c["id"] as string} value={c["id"] as string}>{c["name"] as string}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadStudents}
          disabled={!selectedClass || loading}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load students"}
        </button>
      </div>

      {/* Students table */}
      {loaded && promotions.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Promoted",    value: summary.promoted,      color: "text-green-600" },
              { label: "2nd Sitting", value: summary.secondSitting, color: "text-blue-600"  },
              { label: "Repeat",      value: summary.repeat,        color: "text-amber-600" },
              { label: "Discontinued",value: summary.discontinued,  color: "text-red-600"   },
            ].map((s) => (
              <div key={s.label} className="card p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">
                {promotions.length} Students — {classes.find((c: Record<string,unknown>) => c["id"] === selectedClass)?.["name"] as string}
              </h2>
              {/* Bulk set all promoted */}
              <button
                onClick={() => promotions.forEach(p => updateToClass(p.studentId, ""))}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all target classes
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="text-center">Annual %</th>
                    <th>Decision</th>
                    <th>Next Class (if promoted)</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p) => {
                    const dc = DECISION_CONFIG[p.decision];
                    return (
                      <tr key={p.studentId}>
                        <td>
                          <div className="font-medium text-gray-900">{p.fullName}</div>
                          <div className="text-xs font-mono text-gray-400">{p.studentCode}</div>
                        </td>
                        <td className="text-center">
                          <span className={`font-mono text-sm font-bold ${p.percentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                            {p.percentage > 0 ? `${p.percentage.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td>
                          <select
                            value={p.decision}
                            onChange={(e) => updateDecision(p.studentId, e.target.value as Decision)}
                            className={`text-xs font-medium px-2 py-1.5 rounded border ${dc.color} bg-transparent focus:outline-none cursor-pointer`}
                          >
                            {Object.entries(DECISION_CONFIG).map(([key, val]) => (
                              <option key={key} value={key}>{val.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {p.decision === "promoted" ? (
                            <select
                              value={p.toClassId}
                              onChange={(e) => updateToClass(p.studentId, e.target.value)}
                              className={`text-sm px-2 py-1.5 rounded border bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 ${!p.toClassId ? "border-red-300" : "border-gray-300"}`}
                            >
                              <option value="">— Select next class —</option>
                              {classes
                                .filter((c: Record<string,unknown>) => c["id"] !== selectedClass)
                                .map((c: Record<string,unknown>) => (
                                  <option key={c["id"] as string} value={c["id"] as string}>
                                    {c["name"] as string}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              {p.decision === "repeat" ? "Stays in same class" :
                               p.decision === "second_sitting" ? "Stays for resit" :
                               "Leaves school"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirm button */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">
              This will move {summary.promoted} students to <strong>{nextYear}</strong> and update their classes permanently.
            </div>
            <button
              onClick={() => promoteMutation.mutate()}
              disabled={promoteMutation.isPending || promotions.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4" />
              {promoteMutation.isPending ? "Processing…" : `Confirm promotion for ${promotions.length} students`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
