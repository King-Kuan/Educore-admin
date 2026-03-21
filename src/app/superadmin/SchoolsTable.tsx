import { adminDb } from "@/lib/firebase/admin";
import type { School } from "@/lib/types";
import { formatRwf, calculateAnnualFee, formatRwf } from "@/lib/utils/helpers";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Props { limit?: number }

export async function SchoolsTable({ limit }: Props) {
  let query = adminDb
    .collection("schools")
    .orderBy("createdAt", "desc");

  if (limit) query = query.limit(limit) as typeof query;

  const snap   = await query.get();
  const schools = snap.docs.map((d) => ({ id: d.id, ...d.data() } as School));

  if (schools.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 text-sm">
        No schools yet. Create the first one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>School</th>
            <th>Code</th>
            <th>Students</th>
            <th>Annual Fee</th>
            <th>Subscription</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {schools.map((school) => {
            const { amountRwf } = calculateAnnualFee(school.studentCount ?? 0);
            return (
              <tr key={school.id}>
                <td>
                  <div className="font-medium text-gray-900">{school.name}</div>
                  <div className="text-xs text-gray-400">{school.email}</div>
                </td>
                <td>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {school.code}
                  </span>
                </td>
                <td className="font-mono text-sm">{school.studentCount ?? 0}</td>
                <td className="font-mono text-sm">{formatRwf(amountRwf)}</td>
                <td>
                  <SubscriptionBadge status={school.subscriptionStatus} />
                </td>
                <td>
                  {school.isActive ? (
                    <span className="badge badge-green">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : school.approvedAt ? (
                    <span className="badge badge-red">
                      <XCircle className="w-3 h-3" /> Suspended
                    </span>
                  ) : (
                    <span className="badge badge-amber">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </td>
                <td>
                  <a
                    href={`/superadmin/schools/${school.id}`}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    Manage →
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionBadge({ status }: { status: string }) {
  if (status === "active")  return <span className="badge badge-green">Active</span>;
  if (status === "trial")   return <span className="badge badge-blue">Trial</span>;
  if (status === "expired") return <span className="badge badge-red">Expired</span>;
  return <span className="badge badge-gray">{status}</span>;
}
