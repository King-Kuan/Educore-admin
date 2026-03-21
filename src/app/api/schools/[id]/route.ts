import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const { id } = await params;
  const snap   = await adminDb.collection("schools").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: snap.id, ...snap.data() });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const { id }  = await params;
  const updates = await request.json();

  // Remove read-only fields
  delete updates.id;
  delete updates.code;
  delete updates.createdAt;

  await adminDb.collection("schools").doc(id).update({
    ...updates,
    updatedAt: Timestamp.now(),
  });

  return NextResponse.json({ ok: true });
}
