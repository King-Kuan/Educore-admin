"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

const DAYS   = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS  = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"];

interface Slot {
  id:        string;
  classId:   string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
  room:      string | null;
}

export default function TimetablePage() {
  const { schoolId } = useAuthStore();
  const qc           = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [term,  setTerm]  = useState(getCurrentTerm());
  const [year]            = useState(getCurrentAcademicYear());
  const [adding, setAdding] = useState<{ day: number; hour: string } | null>(null);
  const [newSlot, setNewSlot] = useState({ subjectId: "", teacherId: "", startTime: "", endTime: "", room: "" });

  const { data: classesData } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn:  async () => (await fetch(`/api/classes?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const { data: ttData, isLoading } = useQuery({
    queryKey: ["timetable", schoolId, selectedClass, term, year],
    queryFn:  async () => {
      if (!selectedClass) return { slots: [] };
      const p = new URLSearchParams({ schoolId: schoolId!, classId: selectedClass, term: String(term), academicYear: year });
      return (await fetch(`/api/timetable?${p}`)).json();
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-for-class", schoolId, selectedClass],
    queryFn:  async () => {
      if (!selectedClass) return { subjects: [] };
      return (await fetch(`/api/subjects?schoolId=${schoolId}&classId=${selectedClass}`)).json();
    },
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: teachersData } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn:  async () => (await fetch(`/api/teachers?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const addMutation = useMutation({
    mutationFn: async (slot: typeof newSlot & { dayOfWeek: number }) => {
      const res = await fetch("/api/timetable", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ schoolId, classId: selectedClass, term, academicYear: year, ...slot }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Slot added");
      qc.invalidateQueries({ queryKey: ["timetable"] });
      setAdding(null);
      setNewSlot({ subjectId: "", teacherId: "", startTime: "", endTime: "", room: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Slot removed");
      qc.invalidateQueries({ queryKey: ["timetable"] });
    },
  });

  const classes  = classesData?.classes  ?? [];
  const subjects = subjectsData?.subjects ?? [];
  const teachers = teachersData?.teachers ?? [];
  const slots: Slot[] = ttData?.slots ?? [];

  const getSlot = (day: number, hour: string) =>
    slots.filter((s) => s.dayOfWeek === day + 1 && s.startTime === hour);

  const subjectName = (id: string) => subjects.find((s: Record<string,unknown>) => s["id"] === id)?.["name"] as string ?? "—";
  const teacherName = (id: string) => teachers.find((t: Record<string,unknown>) => t["uid"] === id)?.["displayName"] as string ?? "—";

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build weekly class schedules</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none min-w-36">
            <option value="">— Select —</option>
            {classes.map((c: Record<string,unknown>) => <option key={c["id"] as string} value={c["id"] as string}>{c["name"] as string}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Term</label>
          <select value={term} onChange={(e) => setTerm(parseInt(e.target.value) as 1|2|3)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none">
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Timetable grid */}
      {selectedClass ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-brand-600 text-white">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider w-20">Time</th>
                  {DAYS.map((d) => (
                    <th key={d} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hIdx) => (
                  <tr key={hour} className={hIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500 border-r border-gray-100 w-20">{hour}</td>
                    {DAYS.map((_, dayIdx) => {
                      const daySlots = getSlot(dayIdx, hour);
                      return (
                        <td key={dayIdx} className="px-2 py-1.5 border-r border-gray-100 min-w-32 align-top">
                          {daySlots.map((slot) => (
                            <div key={slot.id} className="group relative bg-brand-50 border border-brand-100 rounded p-1.5 mb-1 text-xs">
                              <div className="font-semibold text-brand-800 truncate">{subjectName(slot.subjectId)}</div>
                              <div className="text-brand-600 truncate">{teacherName(slot.teacherId)}</div>
                              {slot.room && <div className="text-brand-400">{slot.room}</div>}
                              <div className="text-brand-400 font-mono">{slot.startTime}–{slot.endTime}</div>
                              <button
                                onClick={() => deleteMutation.mutate(slot.id)}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => { setAdding({ day: dayIdx + 1, hour }); setNewSlot((p) => ({ ...p, startTime: hour })); }}
                            className="opacity-0 hover:opacity-100 w-full text-left text-xs text-gray-400 hover:text-brand-600 py-1 flex items-center gap-1 transition-opacity"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-400 text-sm">Select a class to view or build the timetable</div>
      )}

      {/* Add slot modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">
              Add slot — {DAYS[adding.day - 1]} at {adding.hour}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Subject</label>
                <select value={newSlot.subjectId} onChange={(e) => setNewSlot((p) => ({ ...p, subjectId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="">— Subject —</option>
                  {subjects.map((s: Record<string,unknown>) => <option key={s["id"] as string} value={s["id"] as string}>{s["name"] as string}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Teacher</label>
                <select value={newSlot.teacherId} onChange={(e) => setNewSlot((p) => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
                  <option value="">— Teacher —</option>
                  {teachers.map((t: Record<string,unknown>) => <option key={t["uid"] as string} value={t["uid"] as string}>{t["displayName"] as string}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Start</label>
                  <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">End</label>
                  <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Room (optional)</label>
                <input value={newSlot.room} onChange={(e) => setNewSlot((p) => ({ ...p, room: e.target.value }))}
                  placeholder="Room 4A"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAdding(null)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => addMutation.mutate({ ...newSlot, dayOfWeek: adding.day })}
                disabled={!newSlot.subjectId || !newSlot.teacherId || addMutation.isPending}
                className="px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
                {addMutation.isPending ? "Adding…" : "Add slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
