"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import { Save, Plus, Trash2, Upload } from "lucide-react";

export default function SettingsPage() {
  const { schoolId }  = useAuthStore();
  const qc            = useQueryClient();
  const [activeTab, setActiveTab] = useState<"school" | "levels" | "subjects">("school");
  const [logoUploading, setLogoUploading] = useState(false);

  // School info
  const { data: schoolData } = useQuery({
    queryKey: ["school", schoolId],
    queryFn:  async () => {
      const res = await fetch(`/api/schools?schoolId=${schoolId}`);
      const d   = await res.json();
      return d.schools?.[0] ?? null;
    },
    enabled: !!schoolId,
  });

  // Levels
  const { data: levelsData } = useQuery({
    queryKey: ["levels", schoolId],
    queryFn:  async () => (await fetch(`/api/levels?schoolId=${schoolId}`)).json(),
    enabled:  !!schoolId,
  });

  const [school, setSchool] = useState<Record<string, unknown>>({});
  const [newLevel, setNewLevel] = useState({ name: "", gradingType: "percentage", passMark: 50 });

  const updateSchoolMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const res = await fetch(`/api/schools/${schoolId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: () => {
      toast.success("School updated");
      qc.invalidateQueries({ queryKey: ["school"] });
    },
    onError: () => toast.error("Update failed"),
  });

  const addLevelMutation = useMutation({
    mutationFn: async (level: typeof newLevel) => {
      const res = await fetch("/api/levels", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ schoolId, ...level }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Level added");
      qc.invalidateQueries({ queryKey: ["levels"] });
      setNewLevel({ name: "", gradingType: "percentage", passMark: 50 });
    },
  });

  const deleteLevelMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/levels/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Level removed");
      qc.invalidateQueries({ queryKey: ["levels"] });
    },
  });

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        if (!base64) throw new Error("Failed to read file");
        const res  = await fetch("/api/imagekit/upload", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ base64, type: "logo", schoolId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        if (!json.url) throw new Error("No URL returned from upload");
        await updateSchoolMutation.mutateAsync({ logoUrl: json.url });
        toast.success("Logo updated");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Logo upload failed");
      } finally {
        setLogoUploading(false);
      }
    };
    reader.onerror = () => { toast.error("Failed to read file"); setLogoUploading(false); };
    reader.readAsDataURL(file);
  };

  const levels = levelsData?.levels ?? [];
  const info   = schoolData ?? {};

  const tabs = [
    { id: "school",   label: "School Info"   },
    { id: "levels",   label: "School Levels" },
    { id: "subjects", label: "Subjects"      },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Tab nav */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* School Info Tab */}
      {activeTab === "school" && (
        <div className="card p-6 space-y-5 max-w-2xl">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">School Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                {info["logoUrl"]
                  ? <img src={info["logoUrl"] as string} alt="Logo" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-gray-400">{(info["abbreviation"] as string ?? "S").charAt(0)}</span>
                }
              </div>
              <label className={`flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 ${logoUploading ? "opacity-50" : ""}`}>
                <Upload className="w-4 h-4" />
                {logoUploading ? "Uploading…" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "name",     label: "School Name",   type: "text" },
              { key: "phone",    label: "Phone",         type: "tel"  },
              { key: "email",    label: "Email",         type: "email"},
              { key: "address",  label: "Address",       type: "text" },
              { key: "district", label: "District",      type: "text" },
            ].map((field) => (
              <div key={field.key} className={field.key === "name" || field.key === "address" ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">{field.label}</label>
                <input
                  type={field.type}
                  defaultValue={info[field.key] as string ?? ""}
                  onChange={(e) => setSchool((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => updateSchoolMutation.mutate(school)}
            disabled={updateSchoolMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateSchoolMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {/* Levels Tab */}
      {activeTab === "levels" && (
        <div className="space-y-4 max-w-2xl">
          <div className="card divide-y divide-gray-100">
            {levels.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No levels yet. Add your school's academic levels.</div>
            ) : (
              levels.map((level: Record<string, unknown>) => (
                <div key={level["id"] as string} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{level["name"] as string}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 capitalize">{level["gradingType"] as string} grading</span>
                      <span className="text-xs text-gray-400">Pass mark: {level["passMark"] as number}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteLevelMutation.mutate(level["id"] as string)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add level */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-3 text-sm">Add Level</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Name</label>
                <input
                  value={newLevel.name}
                  onChange={(e) => setNewLevel((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Nursery, P1–P6, S1–S3"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Grading</label>
                <select
                  value={newLevel.gradingType}
                  onChange={(e) => setNewLevel((p) => ({ ...p, gradingType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                >
                  <option value="percentage">Percentage (A–F)</option>
                  <option value="descriptors">Descriptors (Nursery)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Pass Mark %</label>
                <input
                  type="number" min={0} max={100}
                  value={newLevel.passMark}
                  onChange={(e) => setNewLevel((p) => ({ ...p, passMark: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => addLevelMutation.mutate(newLevel)}
              disabled={!newLevel.name || addLevelMutation.isPending}
              className="mt-3 flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {addLevelMutation.isPending ? "Adding…" : "Add level"}
            </button>
          </div>
        </div>
      )}

      {/* Subjects tab points to classes page */}
      {activeTab === "subjects" && (
        <div className="card p-8 text-center max-w-2xl">
          <p className="text-sm text-gray-500 mb-3">
            Subjects are managed per school level inside the Classes section.
          </p>
          <a href="/principal/classes" className="text-sm text-brand-600 hover:underline font-medium">
            Go to Classes →
          </a>
        </div>
      )}
    </div>
  );
}
