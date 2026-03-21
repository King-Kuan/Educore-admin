import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSession, requireRole } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";

// GET /api/timetable?schoolId=&classId=&teacherId=&term=&academicYear=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId     = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId      = searchParams.get("classId");
  const teacherId    = searchParams.get("teacherId");
  const term         = parseInt(searchParams.get("term") ?? String(getCurrentTerm()));
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = adminDb
    .collection("schools").doc(schoolId)
    .collection("timetable")
    .where("term", "==", term)
    .where("academicYear", "==", academicYear) as FirebaseFirestore.Query;

  if (classId)   query = query.where("classId",   "==", classId);
  if (teacherId) query = query.where("teacherId", "==", teacherId);

  const snap  = await query.orderBy("dayOfWeek").get();
  const slots = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ slots, total: slots.length });
}

// POST /api/timetable — add a slot
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room, term, academicYear } = body;

  if (!classId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
    return NextResponse.json({ error: "classId, subjectId, teacherId, dayOfWeek, startTime, endTime required" }, { status: 400 });
  }

  // Check no conflict for this class at same time
  const conflictSnap = await adminDb
    .collection("schools").doc(schoolId!)
    .collection("timetable")
    .where("classId",   "==", classId)
    .where("dayOfWeek", "==", dayOfWeek)
    .where("startTime", "==", startTime)
    .where("term",      "==", term ?? getCurrentTerm())
    .limit(1)
    .get();

  if (!conflictSnap.empty) {
    return NextResponse.json({ error: "A slot already exists at this time for this class" }, { status: 409 });
  }

  const ref = await adminDb
    .collection("schools").doc(schoolId!)
    .collection("timetable")
    .add({
      classId, subjectId, teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room:         room ?? null,
      term:         term ?? getCurrentTerm(),
      academicYear: academicYear ?? getCurrentAcademicYear(),
      createdAt:    Timestamp.now(),
    });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
