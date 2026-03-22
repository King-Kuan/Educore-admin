"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Plus, Search, CheckCircle2, XCircle,
  Building2, Users, CreditCard, MoreVertical,
  ExternalLink, ChevronDown,
} from "lucide-react";
import { formatRwf, calculateAnnualFee } from "@/lib/utils/helpers";

interface School {
  id:                 string;
  name:               string;
  code:               string;
  abbreviation:       string;
  email:              string;
  phone:              string;
  district:           string;
  studentCount:       number;
  subscriptionStatus: string;
  isActive:           boolean;
  approvedAt:         unknown;
  createdAt:          unknown;
}

interface CreateSchoolForm {
  name:         string;
  abbreviation: string;
  code:         string;
  email:        string;
  phone:        string;
  district:     string;
  principalName:  string;
  principalEmail: string;
}

export default function SuperadminSchoolsPage() {
  const qc                  = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]     = useState<CreateSchoolForm>({
    name: "", abbreviation: "", code: "", email: "",
    phone: "", district: "", principalName: "", principalEmail: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["all-schools"],
    queryFn:  async () => {
      const res = await fetch("/api/schools");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateSchoolForm) => {
      const res = await fetch("/api/schools", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("School created and principal invited");
      qc.invalidateQueries({ queryKey: ["all-schools"] });
      setShowCreate(false);
      setForm({ name: "", abbreviation: "", code: "", email: "", phone: "", district: "", principalName: "", principalEmail: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const res = await fetch(`/api/schools/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast.success(vars.approve ? "School approved" : "School suspended");
      qc.invalidateQueries({ queryKey: ["all-schools"] });
    },
  });

  const schools: School[] = data?.schools ?? [];
  const filtered = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.code.includes(search)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Schools</h1>
          <p className="text-sm text-gray-500 mt-0.5">{schools.length} schools registered</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
        >
          <Plus className="w-4 h-4" /> New school
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading schools…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No schools found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Code</th>
                  <th>District</th>
                  <th>Students</th>
                  <th>Annual Fee</th>
                  <th>Subscription</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school) => {
                  const { amountRwf, planType } = calculateAnnualFee(school.studentCount ?? 0);
                  return (
                    <tr key={school.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {school.abbreviation?.slice(0, 2) ?? "SC"}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{school.name}</div>
                            <div className="text-xs text-gray-400">{school.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{school.code}</span>
                      </td>
                      <td className="text-sm text-gray-600">{school.district || "—"}</td>
                      <td className="font-mono text-sm text-center">{school.studentCount ?? 0}</td>
                      <td>
                        <div className="text-sm font-mono">{formatRwf(amountRwf)}</div>
                        <div className="text-xs text-gray-400">{planType === "flat" ? "Flat rate" : "Per student"}</div>
                      </td>
                      <td>
                        {school.subscriptionStatus === "active"  && <span className="badge badge-green">Active</span>}
                        {school.subscriptionStatus === "trial"   && <span className="badge badge-blue">Trial</span>}
                        {school.subscriptionStatus === "expired" && <span className="badge badge-red">Expired</span>}
                        {school.subscriptionStatus === "suspended" && <span className="badge badge-gray">Suspended</span>}
                      </td>
                      <td>
                        {school.isActive
                          ? <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" /> Active</span>
                          : school.approvedAt
                          ? <span className="badge badge-red"><XCircle className="w-3 h-3" /> Suspended</span>
                          : <span className="badge badge-amber">Pending</span>
                        }
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {!school.approvedAt && (
                            <button
                              onClick={() => approveMutation.mutate({ id: school.id, approve: true })}
                              className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                            >
                              Approve
                            </button>
                          )}
                          {school.isActive && (
                            <button
                              onClick={() => approveMutation.mutate({ id: school.id, approve: false })}
                              className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100"
                            >
                              Suspend
                            </button>
                          )}
                          <a
                            href={`/superadmin/schools/${school.id}`}
                            className="text-xs text-brand-600 hover:underline px-1"
                          >
                            View →
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

      {/* Create School Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-5 text-lg">Create New School</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">School Name</label>
                  <input
                    required value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Groupe Scolaire Kacyiru"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Abbreviation</label>
                  <input
                    required value={form.abbreviation} maxLength={6}
                    onChange={(e) => setForm((p) => ({ ...p, abbreviation: e.target.value.toUpperCase() }))}
                    placeholder="GSK"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">School Code (3 digits)</label>
                  <input
                    required value={form.code} maxLength={3} pattern="\d{3}"
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="001"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-mono focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">School Email</label>
                  <input
                    required type="email" value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="admin@school.rw"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+250 788 000 000"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">District</label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none"
                  >
                    <option value="">— Select district —</option>
                    {["Kigali City", "Gasabo", "Kicukiro", "Nyarugenge", "Huye", "Musanze", "Rubavu", "Rusizi", "Nyagatare", "Bugesera"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Principal Account</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Principal Name</label>
                    <input
                      required value={form.principalName}
                      onChange={(e) => setForm((p) => ({ ...p, principalName: e.target.value }))}
                      placeholder="Emmanuel Nzabonimpa"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">Principal Email</label>
                    <input
                      required type="email" value={form.principalEmail}
                      onChange={(e) => setForm((p) => ({ ...p, principalEmail: e.target.value }))}
                      placeholder="principal@school.rw"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-600 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  A welcome email with a temporary password will be sent to the principal automatically.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating…" : "Create school"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
