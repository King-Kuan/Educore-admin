"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";
import toast from "react-hot-toast";
import { FileText, Download, Loader2, Users, User } from "lucide-react";

export default function ReportsPage() {
  const { schoolId } = useAuthStore();
  const [selectedClass,  setSelectedClass]  = useState("");
  const [selectedTerm,   setSelectedTerm]   = useState<string>(String(getCurrentTerm()));
  const [selectedYear,   setSelectedYear]   = useState(getCurrentAcademicYear());
  const [generating,     setGenerating]     = useState<string | null>(null);
  const [preview,        setPreview]        = useState<Record<string, unknown> | null>(null);

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      return res.json();
    },
    enabled: !!schoolId,
  });

  const { data: studentsData } = useQuery({
    queryKey: ["students", schoolId, selectedClass],
    queryFn:  async () => {
      if (!selectedClass) return { students: [] };
      const res = await fetch(`/api/students?schoolId=${schoolId}&classId=${selectedClass}`);
      return res.json();
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const classes  = classesData?.classes  ?? [];
  const students = studentsData?.students ?? [];

  const previewReport = async () => {
    if (!selectedClass) { toast.error("Select a class"); return; }
    setGenerating("preview");
    try {
      const res = await fetch("/api/reports/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          schoolId, classId: selectedClass,
          term: selectedTerm === "annual" ? "annual" : parseInt(selectedTerm),
          academicYear: selectedYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
      toast.success(`Loaded ${data.totalStudents} students`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load report data");
    } finally {
      setGenerating(null);
    }
  };

  const downloadPDF = async (studentId?: string) => {
    if (!selectedClass) { toast.error("Select a class"); return; }
    const key = studentId ?? "bulk";
    setGenerating(key);
    try {
      const params = new URLSearchParams({
        schoolId:    schoolId!,
        classId:     selectedClass,
        term:        selectedTerm,
        academicYear: selectedYear,
      });
      if (studentId) params.set("studentId", studentId);

      const res = await fetch(`/api/reports/pdf?${params}`);
      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `report_${selectedClass}_${selectedTerm}_${selectedYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setGenerating(null);
    }
  };

  const years = [getCurrentAcademicYear(), `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate and download student report cards</p>
        </div>
      </div>

      {/* Config card */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm">Report Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setPreview(null); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none bg-white"
            >
              <option value="">— Select class —</option>
              {classes.map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => { setSelectedTerm(e.target.value); setPreview(null); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none bg-white"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
              <option value="annual">Annual (Full Year)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Academic Year</label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setPreview(null); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none bg-white"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={previewReport}
            disabled={!selectedClass || generating === "preview"}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {generating === "preview"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileText className="w-4 h-4" />
            }
            Load class data
          </button>

          <button
            onClick={() => downloadPDF()}
            disabled={!selectedClass || !preview || generating === "bulk"}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            {generating === "bulk"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            Download all PDFs
          </button>
        </div>
      </div>

      {/* Preview table */}
      {preview && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-800 text-sm">
                {(preview.totalStudents as number)} students · {selectedTerm === "annual" ? "Annual" : `Term ${selectedTerm}`} · {selectedYear}
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Student</th>
                  <th>Reg. Number</th>
                  {selectedTerm !== "annual" ? (
                    <>
                      <th>Total</th>
                      <th>Max</th>
                      <th>%</th>
                      <th>Grade</th>
                    </>
                  ) : (
                    <>
                      <th>Annual Total</th>
                      <th>Annual %</th>
                      <th>Grade</th>
                      <th>Decision</th>
                    </>
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(preview.students as Record<string, unknown>[]).map((s, i) => {
                  const stu = (s["student"] ?? s) as Record<string, unknown>;
                  const isAnnual = selectedTerm === "annual";
                  return (
                    <tr key={i}>
                      <td>
                        <span className={`font-mono text-sm font-bold ${i < 3 ? "text-amber-600" : "text-gray-500"}`}>
                          {isAnnual ? s["annualPosition"] : s["position"]}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">/{preview.totalStudents as number}</span>
                      </td>
                      <td className="font-medium">{stu["fullName"] as string}</td>
                      <td><span className="font-mono text-xs text-gray-500">{stu["registrationNumber"] as string}</span></td>
                      {isAnnual ? (
                        <>
                          <td className="font-mono text-sm">{s["annualTotal"] as number}/{s["annualMax"] as number}</td>
                          <td>
                            <span className={`font-mono text-sm font-bold ${(s["annualPercentage"] as number) >= 50 ? "text-green-600" : "text-red-600"}`}>
                              {(s["annualPercentage"] as number)?.toFixed(1)}%
                            </span>
                          </td>
                          <td><span className={`grade-${(s["annualGrade"] as string)?.toLowerCase()}`}>{s["annualGrade"] as string}</span></td>
                          <td>
                            <span className={`badge ${s["firstDecision"] === "promoted" ? "badge-green" : s["firstDecision"] === "second_sitting" ? "badge-amber" : "badge-red"}`}>
                              {s["firstDecision"] === "promoted" ? "Promoted" : s["firstDecision"] === "second_sitting" ? "2nd Sitting" : "Repeat"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="font-mono text-sm">{s["grandTotal"] as number}</td>
                          <td className="font-mono text-sm text-gray-400">{s["grandMax"] as number}</td>
                          <td>
                            <span className={`font-mono text-sm font-bold ${(s["percentage"] as number) >= 50 ? "text-green-600" : "text-red-600"}`}>
                              {(s["percentage"] as number)?.toFixed(1)}%
                            </span>
                          </td>
                          <td><span className={`grade-${(s["grade"] as string)?.toLowerCase()}`}>{s["grade"] as string}</span></td>
                        </>
                      )}
                      <td>
                        <button
                          onClick={() => downloadPDF(stu["id"] as string)}
                          disabled={!!generating}
                          className="flex items-center gap-1 text-xs text-brand-600 hover:underline disabled:opacity-50"
                        >
                          {generating === (stu["id"] as string)
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Download className="w-3 h-3" />
                          }
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
