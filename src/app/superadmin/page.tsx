import { Suspense } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { School2, Users, CreditCard, TrendingUp } from "lucide-react";
import { formatRwf } from "@/lib/utils/helpers";
import { SchoolsTable } from "./SchoolsTable";

async function getStats() {
  const [schoolsSnap, usersSnap] = await Promise.all([
    adminDb.collection("schools").get(),
    adminDb.collection("users").where("role", "!=", "superadmin").get(),
  ]);

  const schools   = schoolsSnap.docs.map((d) => d.data());
  const active    = schools.filter((s) => s.isActive).length;
  const revenue   = schools
    .filter((s) => s.subscriptionStatus === "active")
    .reduce((sum, s) => {
      const count = s.studentCount ?? 0;
      return sum + (count <= 300 ? 170_000 : count * 700);
    }, 0);

  return {
    totalSchools:  schools.length,
    activeSchools: active,
    totalUsers:    usersSnap.size,
    annualRevenue: revenue,
  };
}

export default async function SuperadminPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "Total Schools",
      value: stats.totalSchools,
      sub:   `${stats.activeSchools} active`,
      icon:  <School2 className="w-5 h-5" />,
      color: "bg-brand-600",
    },
    {
      label: "Total Users",
      value: stats.totalUsers,
      sub:   "Teachers + principals",
      icon:  <Users className="w-5 h-5" />,
      color: "bg-blue-600",
    },
    {
      label: "Annual Revenue",
      value: formatRwf(stats.annualRevenue),
      sub:   "Active subscriptions",
      icon:  <CreditCard className="w-5 h-5" />,
      color: "bg-emerald-600",
    },
    {
      label: "Growth",
      value: `+${stats.activeSchools}`,
      sub:   "Schools this year",
      icon:  <TrendingUp className="w-5 h-5" />,
      color: "bg-violet-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`${card.color} w-9 h-9 rounded-lg flex items-center justify-center text-white`}>
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{card.value}</div>
            <div className="text-sm font-medium text-gray-600">{card.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent schools */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Schools</h2>
          <a href="/superadmin/schools" className="text-sm text-brand-600 hover:underline font-medium">
            View all →
          </a>
        </div>
        <Suspense fallback={<div className="p-8 text-center text-gray-400 text-sm">Loading…</div>}>
          <SchoolsTable limit={8} />
        </Suspense>
      </div>
    </div>
  );
}
