"use client";

import { useQuery } from "@tanstack/react-query";

export default function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn:  async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const users: Record<string, unknown>[] = data?.users ?? [];

  const roleColor = (role: string) => ({
    superadmin: "bg-purple-50 text-purple-700 border-purple-200",
    principal:  "bg-blue-50  text-blue-700  border-blue-200",
    deputy:     "bg-amber-50 text-amber-700 border-amber-200",
    teacher:    "bg-green-50 text-green-700 border-green-200",
  }[role] ?? "bg-gray-50 text-gray-600 border-gray-200");

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>School ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user["uid"] as string}>
                    <td>
                      <div className="font-medium text-gray-900">{user["displayName"] as string}</div>
                      <div className="text-xs text-gray-400">{user["email"] as string}</div>
                    </td>
                    <td>
                      <span className={`badge text-xs font-mono px-2 py-0.5 rounded border ${roleColor(user["role"] as string)}`}>
                        {user["role"] as string}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-gray-500">
                        {(user["schoolId"] as string) ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user["status"] === "active" ? "badge-green" : "badge-red"}`}>
                        {user["status"] as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
