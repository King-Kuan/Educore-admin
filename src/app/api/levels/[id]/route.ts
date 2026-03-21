import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const { id }   = await params;
  const schoolId = claims!.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  await adminDb
    .collection("schools").doc(schoolId)
    .collection("schoolLevels").doc(id)
    .delete();

  return NextResponse.json({ ok: true });
}
