import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/api";
import { deleteFromR2 } from "@/lib/utils/r2";
import { Timestamp } from "firebase-admin/firestore";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { id }   = await params;
  const schoolId = claims!.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const fileDoc = await adminDb
    .collection("schools").doc(schoolId)
    .collection("files").doc(id)
    .get();

  if (!fileDoc.exists) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const fileData = fileDoc.data()!;

  // Soft-delete in Firestore
  await fileDoc.ref.update({ isDeleted: true, deletedAt: Timestamp.now() });

  // Hard-delete from R2
  if (fileData["r2Key"]) {
    try {
      await deleteFromR2(fileData["r2Key"]);
    } catch {
      // R2 delete failed — file is still soft-deleted in Firestore
    }
  }

  return NextResponse.json({ ok: true });
}
