"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { UserPlus, Mail, Shield, X, ChevronDown } from "lucide-react";
import { DEPUTY_PERMISSIONS } from "@/lib/types";

const inviteSchema = z.object({
  displayName: z.string().min(2, "Name required"),
  email:       z.string().email("Valid email required"),
  role:        z.enum(["teacher", "deputy"]),
  permissions: z.array(z.string()).optional(),
});
type InviteForm = z.infer<typeof inviteSchema>;

export default function TeachersPage() {
  const { schoolId }   = useAuthStore();
  const qc             = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn:  async () => {
      const res = await fetch(`/api/teachers?schoolId=${schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return res.json();
    },
    enabled: !!schoolId,
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "teacher", permissions: [] },
  });

  const selectedRole = watch("role");
  const teachers     = data?.teachers ?? [];

  const onSubmit = async (form: InviteForm) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/teachers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, schoolId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to invite");
      toast.success(`Invite sent to ${form.email}`);
      reset();
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["teachers"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (uid: string, status: "active" | "suspended") => {
    const res = await fetch("/api/teachers", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ uid, status }),
    });
    if (res.ok) {
      toast.success(`Teacher ${status}`);
      qc.invalidateQueries({ queryKey: ["teachers"] });
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{teachers.length} staff members</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
        >
          <UserPlus className="w-4 h-4" /> Invite teacher
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-sm">No teachers yet</div>
            <p className="text-xs text-gray-400 mt-1">Invite teachers — they will receive an email with a temporary password.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t: Record<string, unknown>) => (
                <tr key={t["uid"] as string}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-xs">
                        {(t["displayName"] as string).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{t["displayName"] as string}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {t["email"] as string}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${t["role"] === "deputy" ? "badge-blue" : "badge-gray"} flex items-center gap-1 w-fit`}>
                      {t["role"] === "deputy" && <Shield className="w-3 h-3" />}
                      {t["role"] as string}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${t["status"] === "active" ? "badge-green" : "badge-red"}`}>
                      {t["status"] as string}
                    </span>
                  </td>
                  <td className="text-xs text-gray-400 font-mono">
                    {t["lastLoginAt"] ? new Date((t["lastLoginAt"] as { seconds: number }).seconds * 1000).toLocaleDateString() : "Never"}
                  </td>
                  <td>
                    <button
                      onClick={() => updateStatus(t["uid"] as string, t["status"] === "active" ? "suspended" : "active")}
                      className={`text-xs font-medium ${t["status"] === "active" ? "text-red-600 hover:underline" : "text-green-600 hover:underline"}`}
                    >
                      {t["status"] === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Invite a teacher</h3>
              <button onClick={() => { setShowForm(false); reset(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input {...register("displayName")} placeholder="e.g. HABIMANA Jean"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none" />
                {errors.displayName && <p className="text-red-600 text-xs mt-1">{errors.displayName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input {...register("email")} type="email" placeholder="teacher@school.rw"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none" />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select {...register("role")}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 bg-white">
                  <option value="teacher">Teacher</option>
                  <option value="deputy">Deputy / Monitor</option>
                </select>
              </div>

              {selectedRole === "deputy" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions <span className="text-gray-400 font-normal">(select what this deputy can do)</span>
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {DEPUTY_PERMISSIONS.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" value={perm} {...register("permissions")}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-600" />
                        <span className="font-mono text-xs text-gray-600">{perm.replace(/_/g, " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700">
                An email with a temporary password will be sent to this address.
                The teacher will be asked to change it on first login.
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
                  {submitting ? "Sending invite…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
