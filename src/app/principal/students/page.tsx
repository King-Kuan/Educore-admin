"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import Papa from "papaparse";
import {
  UserPlus, Upload, Search, Download,
  MoreHorizontal, Eye, Trash2, Filter,
} from "lucide-react";

interface Student {
  id:           string;
  fullName:     string;
  studentCode:  string;
  registrationNumber: string;
  classId:      string;
  gender:       string;
  parentName:   string;
  parentPhone:  string;
  status:       string;
}

export default function StudentsPage() {
  const { schoolId }       = useAuthStore();
  const qc                 = useQueryClient();
  const [search, setSearch]= useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showImport, setShowImport]   = useState(false);
  const fileRef            = useRef<HTMLInputElement>(null);
  const [importing, setImporting]     = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["students", schoolId, classFilter],
    queryFn:  async () => {
      const params = new URLSearchParams({ schoolId: schoolId! });
      if (classFilter) params.set("classId", classFilter);
      const res = await fetch(`/api/students?${params}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!schoolId,
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      return res.json();
    },
    enabled: !!schoolId,
  });

  const students: Student[] = data?.students ?? [];
  const classes = classesData?.classes ?? [];

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
    s.registrationNumber.includes(search)
  );

  const handleCSVImport = async (file: File) => {
    if (!classFilter) {
      toast.error("Please select a class before importing");
      return;
    }
    setImporting(true);
    Papa.parse(file, {
      header:     true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const res = await fetch("/api/students/import", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              schoolId,
              classId: classFilter,
              students: result.data,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            toast.success(`Imported ${json.created} students${json.errors?.length ? ` (${json.errors.length} errors)` : ""}`);
            qc.invalidateQueries({ queryKey: ["students"] });
            setShowImport(false);
          } else {
            toast.error(json.error ?? "Import failed");
          }
        } catch {
          toast.error("Import failed");
        } finally {
          setImporting(false);
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {students.length} enrolled students
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <a
            href="/principal/students/new"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
          >
            <UserPlus className="w-4 h-4" /> Add student
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code or registration…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white min-w-40"
        >
          <option value="">All classes</option>
          {classes.map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-sm mb-2">No students found</div>
            <p className="text-xs text-gray-400">
              {students.length === 0
                ? "Import students via CSV or add them manually."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student Code</th>
                  <th>Reg. Number</th>
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Parent / Guardian</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const cls = classes.find((c: { id: string; name: string }) => c.id === s.classId);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xs">
                            {s.fullName.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{s.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {s.studentCode}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-gray-500">{s.registrationNumber}</span>
                      </td>
                      <td className="text-sm text-gray-600">{cls?.name ?? "—"}</td>
                      <td>
                        <span className={`badge ${s.gender === "M" ? "badge-blue" : "badge-amber"}`}>
                          {s.gender === "M" ? "Male" : "Female"}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm text-gray-700">{s.parentName}</div>
                        <div className="text-xs text-gray-400 font-mono">{s.parentPhone}</div>
                      </td>
                      <td>
                        <span className={`badge ${s.status === "active" ? "badge-green" : "badge-gray"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <a
                            href={`/principal/students/${s.id}`}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-1">Import Students from CSV</h3>
            <p className="text-sm text-gray-500 mb-4">
              CSV must have columns: firstName, lastName, dob (YYYY-MM-DD), gender (M/F), parentName, parentPhone
            </p>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Class</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              >
                <option value="">— Select class —</option>
                {classes.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 transition-colors mb-4"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to select CSV file</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCSVImport(file);
                }}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-xs font-mono text-gray-500 mb-1">CSV Example:</p>
              <pre className="text-xs text-gray-400 font-mono">
{`firstName,lastName,dob,gender,parentName,parentPhone
Eric,Kamanzi,2015-03-14,M,Jean Kamanzi,0788000001
Marie,Iradukunda,2016-06-02,F,Alphonse Iradukunda,0788000002`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
