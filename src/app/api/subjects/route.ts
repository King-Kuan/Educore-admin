import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";

// GET /api/subjects?schoolId=&classId=&levelId=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId  = searchParams.get("classId");
  const levelId  = searchParams.get("levelId");

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  // If classId provided, look up the class to get its levelId
  let targetLevelId = levelId;
  if (classId && !levelId) {
    const classDoc = await adminDb.collection("schools").doc(schoolId)
      .collection("classes").doc(classId).get();
    targetLevelId = classDoc.data()?.["levelId"] ?? null;
  }

  let query = adminDb.collection("schools").doc(schoolId).collection("subjects")
    .orderBy("order");

  if (targetLevelId) {
    query = query.where("levelId", "==", targetLevelId) as typeof query;
  }

  const snap     = await query.get();
  const subjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ subjects, total: subjects.length });
}

// POST /api/subjects
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { name, levelId, caMax, examMax, order = 0 } = body;
  if (!name || !levelId || caMax === undefined || examMax === undefined) {
    return NextResponse.json({ error: "name, levelId, caMax, examMax required" }, { status: 400 });
  }

  const now = Timestamp.now();
  const ref = await adminDb.collection("schools").doc(schoolId).collection("subjects").add({
    schoolId, name, levelId,
    caMax:    Number(caMax),
    examMax:  Number(examMax),
    totalMax: Number(caMax) + Number(examMax),
    annualMax:(Number(caMax) + Number(examMax)) * 3,
    order:    Number(order),
    createdAt: now, updatedAt: now,
  });

  return NextResponse.json({ id: ref.id, name }, { status: 201 });
}
