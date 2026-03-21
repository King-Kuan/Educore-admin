"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Megaphone, Eye, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Ad {
  id:             string;
  title:          string;
  description:    string;
  imageUrl:       string;
  linkUrl:        string | null;
  targetAudience: string[];
  isActive:       boolean;
  impressions:    number;
  clicks:         number;
  startDate:      unknown;
  endDate:        unknown;
}

const AUDIENCE_OPTIONS = [
  { value: "principal", label: "Principals" },
  { value: "teacher",   label: "Teachers"   },
  { value: "parent",    label: "Parents"    },
];

export default function AdsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", imageUrl: "", linkUrl: "",
    targetAudience: [] as string[], startDate: "", endDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["ads"],
    queryFn:  async () => {
      const res = await fetch("/api/ads");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch("/api/ads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ad created");
      qc.invalidateQueries({ queryKey: ["ads"] });
      setShowCreate(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/ads/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: active }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Ad deleted");
      qc.invalidateQueries({ queryKey: ["ads"] });
    },
  });

  const ads: Ad[] = data?.ads ?? [];

  const toggleAudience = (v: string) => {
    setForm((p) => ({
      ...p,
      targetAudience: p.targetAudience.includes(v)
        ? p.targetAudience.filter((a) => a !== v)
        : [...p.targetAudience, v],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Advertisements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ads shown to principals, teachers and parents
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> New ad
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Ads",   value: ads.length },
          { label: "Active",      value: ads.filter((a) => a.isActive).length },
          { label: "Impressions", value: ads.reduce((s, a) => s + (a.impressions ?? 0), 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ads list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center">
            <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No ads yet. Create your first advertisement.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {ads.map((ad) => (
              <div key={ad.id} className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Megaphone className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-900 text-sm truncate">{ad.title}</span>
                    {ad.isActive
                      ? <span className="badge badge-green text-xs">Active</span>
                      : <span className="badge badge-gray text-xs">Paused</span>
                    }
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">{ad.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      Audience: {ad.targetAudience.map((a) =>
                        a.charAt(0).toUpperCase() + a.slice(1)
                      ).join(", ")}
                    </span>
                    <span>{ad.impressions ?? 0} views</span>
                    <span>{ad.clicks ?? 0} clicks</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: ad.id, active: !ad.isActive })}
                    className="p-2 rounded hover:bg-gray-100 text-gray-500"
                    title={ad.isActive ? "Pause" : "Activate"}
                  >
                    {ad.isActive
                      ? <ToggleRight className="w-5 h-5 text-green-600" />
                      : <ToggleLeft  className="w-5 h-5 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this ad?")) deleteMutation.mutate(ad.id);
                    }}
                    className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-900 mb-4">Create Advertisement</h3>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Title</label>
                <input
                  required value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Image URL</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://ik.imagekit.io/…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Link URL (optional)</label>
                <input
                  type="url" value={form.linkUrl}
                  onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Start Date</label>
                  <input
                    required type="date" value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">End Date</label>
                  <input
                    required type="date" value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Target Audience</label>
                <div className="flex gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => toggleAudience(opt.value)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        form.targetAudience.includes(opt.value)
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                >Cancel</button>
                <button
                  type="submit" disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating…" : "Create ad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
