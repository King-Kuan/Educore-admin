"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { formatRwf, calculateAnnualFee } from "@/lib/utils/helpers";

export default function SchoolDetailPage() {
  const params  = useParams();
  const id      = params.id as string;
  const router  = useRouter();
  const qc      = useQueryClient();

  const { data: school, isLoading } = useQuery({
    queryKey: ["school", id],
    queryFn:  async () => {
      const res = await fetch(`/api/schools/${id}`);
      if (!res.ok) throw new Error("School not found");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (approve: boolean) => {
      const res = await fetch(`/api/schools/${id}/approve`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ approve }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: (_, approve) => {
      toast.success(approve ? "School approved" : "School suspended");
      qc.invalidateQueries({ queryKey: ["school", id] });
    },
    onError: () => toast.error("Action failed"),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
  );

  if (!school) return (
    <div className="flex items-center justify-center py-20 text-gray-400 text-sm">School not found</div>
  );

  const { amountRwf, planType } = calculateAnnualFee(school.studentCount ?? 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">{school.name}</h1>
          <p className="text-sm text-gray-500">{school.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {school.isActive ? (
            <button
              onClick={() => approveMutation.mutate(false)}
              disabled={approveMutation.isPending}
              className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100"
            >
              Suspend
            </button>
          ) : (
            <button
              onClick={() => approveMutation.mutate(true)}
              disabled={approveMutation.isPending}
              className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100"
            >
              Approve
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "School Code",    value: school.code },
          { label: "Abbreviation",   value: school.abbreviation },
          { label: "District",       value: school.district || "—" },
          { label: "Phone",          value: school.phone || "—" },
          { label: "Students",       value: school.studentCount ?? 0 },
          { label: "Annual Fee",     value: `${formatRwf(amountRwf)} (${planType === "flat" ? "Flat" : "Per student"})` },
          { label: "Subscription",   value: school.subscriptionStatus },
          { label: "Status",         value: school.isActive ? "Active" : "Inactive" },
          { label: "Country",        value: school.country || "Rwanda" },
        ].map((field) => (
          <div key={field.label} className="card p-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              {field.label}
            </div>
            <div className="text-sm font-semibold text-gray-900">{field.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
