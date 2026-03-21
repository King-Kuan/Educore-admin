import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole, getSession } from "@/lib/api";
import { calculateGrade, calculateGrade } from "@/lib/utils/grading";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";

// GET /api/marks?schoolId=&classId=&term=&academicYear=
export async function GET(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId     = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId      = searchParams.get("classId");
  const studentId    = searchParams.get("studentId");
  const term         = parseInt(searchParams.get("term") ?? "0");
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = adminDb
    .collection("schools").doc(schoolId)
    .collection("marks")
    .where("academicYear", "==", academicYear);

  if (term)       query = query.where("term", "==", term) as typeof query;
  if (classId)    query = query.where("classId", "==", classId) as typeof query;
  if (studentId)  query = query.where("studentId", "==", studentId) as typeof query;

  const snap  = await query.get();
  const marks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ marks, total: marks.length });
}

// POST /api/marks - submit or update a mark
export async function POST(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const body = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { studentId, subjectId, classId, caScore, examScore, term, academicYear } = body;
  if (!studentId || !subjectId || !classId) {
    return NextResponse.json({ error: "studentId, subjectId, classId required" }, { status: 400 });
  }

  // Get subject to know maxima
  const subjectDoc = await adminDb
    .collection("schools").doc(schoolId)
    .collection("subjects").doc(subjectId).get();
  const subject = subjectDoc.data();
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  // Check if mark is locked
  const existingSnap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("marks")
    .where("studentId", "==", studentId)
    .where("subjectId", "==", subjectId)
    .where("term", "==", term ?? getCurrentTerm())
    .where("academicYear", "==", academicYear ?? getCurrentAcademicYear())
    .limit(1)
    .get();

  if (!existingSnap.empty && existingSnap.docs[0]!.data()["isLocked"]) {
    return NextResponse.json({ error: "Marks are locked for this term" }, { status: 403 });
  }

  const ca   = caScore   ?? 0;
  const exam = examScore ?? 0;
  const total    = ca + exam;
  const totalMax = (subject["caMax"] ?? 0) + (subject["examMax"] ?? 0);

  // Get level grading type
  const levelDoc  = await adminDb.collection("schools").doc(schoolId)
    .collection("schoolLevels").doc(subject["levelId"]).get();
  const gradingType = levelDoc.data()?.["gradingType"] ?? "percentage";

  const { grade } = calculateGrade(total, totalMax, gradingType);
  const now        = Timestamp.now();

  const markData = {
    schoolId,
    studentId,
    subjectId,
    classId,
    teacherId:    claims!.uid,
    term:         term ?? getCurrentTerm(),
    academicYear: academicYear ?? getCurrentAcademicYear(),
    caScore:      ca,
    examScore:    exam,
    totalScore:   total,
    percentage:   totalMax > 0 ? parseFloat(((total / totalMax) * 100).toFixed(2)) : 0,
    grade,
    isLocked:     false,
    lockedAt:     null,
    lockedBy:     null,
    updatedAt:    now,
  };

  if (!existingSnap.empty) {
    await existingSnap.docs[0]!.ref.update(markData);
    return NextResponse.json({ id: existingSnap.docs[0]!.id, ...markData });
  }

  const ref = await adminDb
    .collection("schools").doc(schoolId)
    .collection("marks")
    .add({ ...markData, submittedAt: now });

  return NextResponse.json({ id: ref.id, ...markData }, { status: 201 });
}

// PATCH /api/marks/lock - lock all marks for a class+term
export async function PATCH(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  const { classId, term, academicYear, lock = true } = body;

  if (!schoolId || !classId || !term) {
    return NextResponse.json({ error: "schoolId, classId, term required" }, { status: 400 });
  }

  const snap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("marks")
    .where("classId", "==", classId)
    .where("term", "==", term)
    .where("academicYear", "==", academicYear ?? getCurrentAcademicYear())
    .get();

  const batch = adminDb.batch();
  const now   = Timestamp.now();

  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      isLocked: lock,
      lockedAt: lock ? now : null,
      lockedBy: lock ? claims!.uid : null,
    });
  });

  // Also lock conduct
  const conductSnap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("conduct")
    .where("classId", "==", classId)
    .where("term", "==", term)
    .get();

  conductSnap.docs.forEach((doc) => {
    batch.update(doc.ref, { isLocked: lock, lockedAt: lock ? now : null });
  });

  await batch.commit();

  return NextResponse.json({ locked: snap.size + conductSnap.size, term, classId });
}
