import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { generateStudentCode, generateRegistrationNumber, getCurrentAcademicYear } from "@/lib/utils/helpers";
import { Timestamp } from "firebase-admin/firestore";

// POST /api/students/import
// Body: { schoolId, classId, levelId, academicYear, students: [{firstName,lastName,dob,gender,parentName,parentPhone}] }
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const body = await request.json();
  const schoolId    = claims!.schoolId ?? body.schoolId;
  const academicYear = body.academicYear ?? getCurrentAcademicYear();

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });
  if (!body.classId) return NextResponse.json({ error: "classId required" }, { status: 400 });
  if (!Array.isArray(body.students) || body.students.length === 0) {
    return NextResponse.json({ error: "No students provided" }, { status: 400 });
  }

  const schoolDoc = await adminDb.collection("schools").doc(schoolId).get();
  const school    = schoolDoc.data();
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  // Get current count for sequential IDs
  const existingSnap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("students")
    .where("academicYear", "==", academicYear)
    .get();

  let sequential = existingSnap.size;
  const batch    = adminDb.batch();
  const created: string[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < body.students.length; i++) {
    const row = body.students[i];

    if (!row.firstName || !row.lastName) {
      errors.push({ row: i + 1, reason: "firstName and lastName are required" });
      continue;
    }

    sequential++;
    const studentCode = generateStudentCode(school.abbreviation, academicYear, sequential);
    const regNumber   = generateRegistrationNumber(school.code, academicYear, sequential);
    const now         = Timestamp.now();

    const ref = adminDb
      .collection("schools").doc(schoolId)
      .collection("students")
      .doc();

    batch.set(ref, {
      schoolId,
      classId:            body.classId,
      levelId:            body.levelId ?? "",
      studentCode,
      registrationNumber: regNumber,
      firstName:          String(row.firstName).trim(),
      lastName:           String(row.lastName).trim().toUpperCase(),
      fullName:           `${String(row.lastName).trim().toUpperCase()} ${String(row.firstName).trim()}`,
      dateOfBirth:        row.dob ? Timestamp.fromDate(new Date(row.dob)) : now,
      gender:             row.gender ?? "M",
      photoUrl:           null,
      parentName:         row.parentName ?? "",
      parentPhone:        row.parentPhone ?? "",
      parentEmail:        row.parentEmail ?? null,
      academicYear,
      status:             "active",
      enrolledAt:         now,
      createdAt:          now,
      updatedAt:          now,
    });

    created.push(ref.id);
  }

  await batch.commit();

  // Update school student count
  await adminDb.collection("schools").doc(schoolId).update({
    studentCount: sequential,
  });

  return NextResponse.json({
    created:    created.length,
    errors,
    total:      body.students.length,
  }, { status: 201 });
}
