import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

// PATCH /api/schools/[id]/approve
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { claims, error } = await requireRole("superadmin");
  if (error) return error;

  const { id }     = await params;
  const { approve } = await request.json();
  const now         = Timestamp.now();

  await adminDb.collection("schools").doc(id).update({
    isActive:   approve,
    approvedAt: approve ? now : null,
    approvedBy: approve ? claims!.uid : null,
    subscriptionStatus: approve ? "active" : "suspended",
    updatedAt:  now,
  });

  return NextResponse.json({ ok: true, id, approved: approve });
}
