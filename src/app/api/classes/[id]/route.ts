import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { id }   = await params;
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const snap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("classes").doc(id)
    .get();

  if (!snap.exists) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const data = snap.data()!;

  // Get class teacher name
  let classTeacherName = "";
  if (data["classTeacherId"]) {
    try {
      const t = await adminDb.collection("users").doc(data["classTeacherId"]).get();
      classTeacherName = t.data()?.["displayName"] ?? "";
    } catch { /* ignore */ }
  }

  return NextResponse.json({ id: snap.id, ...data, classTeacherName });
}
