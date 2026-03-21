import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSession, requireRole } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

// GET /api/files/folders?schoolId=&classId=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId  = searchParams.get("classId");
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = adminDb
    .collection("schools").doc(schoolId)
    .collection("fileFolders") as FirebaseFirestore.Query;

  if (classId) query = query.where("classId", "==", classId);

  const snap    = await query.orderBy("createdAt", "desc").get();
  const folders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ folders });
}

// POST /api/files/folders
export async function POST(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  const { classId, name, type = "homework", subjectId } = body;

  if (!schoolId || !classId || !name) {
    return NextResponse.json({ error: "schoolId, classId, name required" }, { status: 400 });
  }

  const ref = await adminDb
    .collection("schools").doc(schoolId)
    .collection("fileFolders")
    .add({
      schoolId, classId, name, type,
      subjectId:  subjectId ?? null,
      createdBy:  claims!.uid,
      createdAt:  Timestamp.now(),
    });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
