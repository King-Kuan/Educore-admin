import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";

// PATCH /api/ads/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole("superadmin");
  if (error) return error;

  const { id }    = await params;
  const updates   = await request.json();

  await adminDb.collection("ads").doc(id).update(updates);
  return NextResponse.json({ ok: true });
}

// DELETE /api/ads/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole("superadmin");
  if (error) return error;

  const { id } = await params;
  await adminDb.collection("ads").doc(id).delete();
  return NextResponse.json({ ok: true });
}
