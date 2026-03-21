"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Shield, GraduationCap } from "lucide-react";

export default function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn:  async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 border-b border-gray-200">User</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 border-b border-gray-200">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 border-b border-gray-200">School</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 bg-gray-50 border-b border-gray-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: Record<string, unknown>) => (
                  <tr key={user["uid"] as string} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{user["displayName"] as string}</div>
                      <div className="text-xs text-gray-400">{user["email"] as string}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded border ${
                        user["role"] === "superadmin" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        user["role"] === "principal"  ? "bg-blue-50 text-blue-700 border-blue-200" :
                        user["role"] === "deputy"     ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-green-50 text-green-700 border-green-200"
                      }`}>
                        {user["role"] as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user["schoolId"] as string ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-mono px-2 py-0.5 rounded border ${
                        user["status"] === "active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
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