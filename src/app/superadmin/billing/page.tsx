"use client";

import { useQuery } from "@tanstack/react-query";
import { formatRwf, calculateAnnualFee } from "@/lib/utils/helpers";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function BillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn:  async () => {
      const res = await fetch("/api/schools");
      return res.json();
    },
  });

  const schools = data?.schools ?? [];

  const stats = {
    totalRevenue:  schools
      .filter((s: Record<string,unknown>) => s["subscriptionStatus"] === "active")
      .reduce((sum: number, s: Record<string,unknown>) => sum + calculateAnnualFee(s["studentCount"] as number ?? 0).amountRwf, 0),
    active:        schools.filter((s: Record<string,unknown>) => s["subscriptionStatus"] === "active").length,
    trial:         schools.filter((s: Record<string,unknown>) => s["subscriptionStatus"] === "trial").length,
    expired:       schools.filter((s: Record<string,unknown>) => s["subscriptionStatus"] === "expired").length,
    total:         schools.length,
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Subscription revenue across all schools</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Annual Revenue", value: formatRwf(stats.totalRevenue), icon: <TrendingUp className="w-5 h-5" />, color: "bg-emerald-600" },
          { label: "Active",         value: stats.active,                  icon: <CheckCircle2 className="w-5 h-5" />, color: "bg-brand-600" },
          { label: "Trial",          value: stats.trial,                   icon: <CreditCard className="w-5 h-5" />,  color: "bg-blue-600"  },
          { label: "Expired",        value: stats.expired,                 icon: <AlertCircle className="w-5 h-5" />, color: "bg-red-600"   },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`${s.color} w-9 h-9 rounded-lg flex items-center justify-center text-white mb-3`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pricing reference */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Pricing Structure</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs font-mono text-gray-400 uppercase tracking-wide mb-1">Standard plan</div>
            <div className="text-2xl font-bold text-gray-900">170,000 <span className="text-sm font-normal text-gray-400">Rwf/yr</span></div>
            <div className="text-sm text-gray-500 mt-1">Up to 300 students · flat rate</div>
          </div>
          <div className="bg-brand-50 rounded-lg p-4 border border-brand-100">
            <div className="text-xs font-mono text-brand-400 uppercase tracking-wide mb-1">Growth plan</div>
            <div className="text-2xl font-bold text-brand-900">700 <span className="text-sm font-normal text-brand-400">Rwf/student/yr</span></div>
            <div className="text-sm text-brand-600 mt-1">Above 300 students · per student</div>
          </div>
        </div>
      </div>

      {/* School billing table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">All Schools</h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Students</th>
                  <th>Plan</th>
                  <th>Annual Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school: Record<string,unknown>) => {
                  const { amountRwf, planType } = calculateAnnualFee(school["studentCount"] as number ?? 0);
                  return (
                    <tr key={school["id"] as string}>
                      <td>
                        <div className="font-medium text-gray-900 text-sm">{school["name"] as string}</div>
                        <div className="text-xs text-gray-400">{school["email"] as string}</div>
                      </td>
                      <td className="font-mono text-sm text-center">{school["studentCount"] as number ?? 0}</td>
                      <td>
                        <span className="text-xs text-gray-500 capitalize">
                          {planType === "flat" ? "Flat (≤300)" : "Per student"}
                        </span>
                      </td>
                      <td className="font-mono text-sm font-medium">{formatRwf(amountRwf)}</td>
                      <td>
                        {school["subscriptionStatus"] === "active"   && <span className="badge badge-green">Active</span>}
                        {school["subscriptionStatus"] === "trial"    && <span className="badge badge-blue">Trial</span>}
                        {school["subscriptionStatus"] === "expired"  && <span className="badge badge-red">Expired</span>}
                        {school["subscriptionStatus"] === "suspended" && <span className="badge badge-gray">Suspended</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm">Total ({schools.length} schools)</td>
                  <td className="px-4 py-3 text-sm text-center font-mono">
                    {schools.reduce((s: number, sc: Record<string,unknown>) => s + (sc["studentCount"] as number ?? 0), 0)}
                  </td>
                  <td></td>
                  <td className="px-4 py-3 text-sm font-mono font-bold text-emerald-700">{formatRwf(stats.totalRevenue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
