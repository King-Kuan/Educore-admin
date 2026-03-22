import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId     = searchParams.get("schoolId") ?? claims!.schoolId;
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  // No orderBy — avoids needing a composite Firestore index
  let snap;
  if (claims!.role === "teacher") {
    snap = await adminDb
      .collection("schools").doc(schoolId)
      .collection("classes")
      .where("academicYear", "==", academicYear)
      .where("teacherIds", "array-contains", claims!.uid)
      .get();
  } else {
    snap = await adminDb
      .collection("schools").doc(schoolId)
      .collection("classes")
      .where("academicYear", "==", academicYear)
      .get();
  }

  // Fetch teacher names for classTeacherId
  const classes = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data();
      let classTeacherName = "";
      if (data["classTeacherId"]) {
        try {
          const teacherDoc = await adminDb.collection("users").doc(data["classTeacherId"]).get();
          classTeacherName = teacherDoc.data()?.["displayName"] ?? "";
        } catch { /* ignore */ }
      }
      return { id: d.id, ...data, classTeacherName };
    })
  );

  // Sort by name in JavaScript
  classes.sort((a, b) => String(a["name"]).localeCompare(String(b["name"])));

  return NextResponse.json({ classes, total: classes.length });
}

export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { name, levelId, classTeacherId = "", teacherIds = [], capacity = 40 } = body;
  if (!name || !levelId) {
    return NextResponse.json({ error: "name and levelId required" }, { status: 400 });
  }

  const now = Timestamp.now();
  const allTeacherIds = classTeacherId
    ? Array.from(new Set([classTeacherId, ...teacherIds]))
    : teacherIds;

  const ref = await adminDb
    .collection("schools").doc(schoolId)
    .collection("classes")
    .add({
      schoolId,
      name,
      levelId,
      classTeacherId,
      teacherIds: allTeacherIds,
      academicYear: body.academicYear ?? getCurrentAcademicYear(),
      capacity,
      studentCount: 0,
      createdAt:    now,
      updatedAt:    now,
    });

  return NextResponse.json({ id: ref.id, name }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  const { classId, ...updates } = body;
  if (!schoolId || !classId) {
    return NextResponse.json({ error: "schoolId and classId required" }, { status: 400 });
  }

  await adminDb
    .collection("schools").doc(schoolId)
    .collection("classes").doc(classId)
    .update({ ...updates, updatedAt: Timestamp.now() });

  return NextResponse.json({ ok: true });
}
