import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

// GET /api/classes?schoolId=&academicYear=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId     = searchParams.get("schoolId") ?? claims!.schoolId;
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = adminDb.collection("schools").doc(schoolId).collection("classes")
    .where("academicYear", "==", academicYear);

  // Teachers only see their assigned classes
  if (claims!.role === "teacher") {
    query = query.where("teacherIds", "array-contains", claims!.uid) as typeof query;
  }

  const snap    = await query.orderBy("name").get();
  const classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ classes, total: classes.length });
}

// POST /api/classes
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { name, levelId, classTeacherId, teacherIds = [], capacity = 40 } = body;
  if (!name || !levelId || !classTeacherId) {
    return NextResponse.json({ error: "name, levelId, classTeacherId required" }, { status: 400 });
  }

  const now = Timestamp.now();
  const ref = await adminDb.collection("schools").doc(schoolId).collection("classes").add({
    schoolId,
    name,
    levelId,
    classTeacherId,
    teacherIds: Array.from(new Set([classTeacherId, ...teacherIds])),
    academicYear: body.academicYear ?? getCurrentAcademicYear(),
    capacity,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: ref.id, name }, { status: 201 });
}

// PATCH /api/classes - update teachers, class teacher etc
export async function PATCH(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  const { classId, ...updates } = body;
  if (!schoolId || !classId) {
    return NextResponse.json({ error: "schoolId and classId required" }, { status: 400 });
  }

  await adminDb.collection("schools").doc(schoolId)
    .collection("classes").doc(classId)
    .update({ ...updates, updatedAt: Timestamp.now() });

  return NextResponse.json({ ok: true });
}
