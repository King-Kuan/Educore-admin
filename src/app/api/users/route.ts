import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";

export async function GET() {
  const { claims, error } = await requireRole("superadmin");
  if (error) return error;

  const snap  = await adminDb.collection("users").orderBy("createdAt", "desc").get();
  const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  return NextResponse.json({ users, total: users.length });
}