import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { generateStudentCode, generateRegistrationNumber, getCurrentAcademicYear } from "@/lib/utils/helpers";
import { Timestamp } from "firebase-admin/firestore";
import type { CreatePayload, Student } from "@/lib/types";

// GET /api/students?schoolId=xxx&classId=xxx&academicYear=xxx
export async function GET(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId    = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId     = searchParams.get("classId");
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  let query = adminDb
    .collection("schools").doc(schoolId)
    .collection("students")
    .where("academicYear", "==", academicYear)
    .where("status", "==", "active");

  if (classId) query = query.where("classId", "==", classId) as typeof query;

  const snap     = await query.orderBy("lastName").get();
  const students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ students, total: students.length });
}

// POST /api/students - create single student
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  // Get school to find abbreviation and code
  const schoolDoc = await adminDb.collection("schools").doc(schoolId).get();
  const school    = schoolDoc.data();
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  // Get next sequential number
  const countSnap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("students")
    .where("academicYear", "==", body.academicYear ?? getCurrentAcademicYear())
    .get();
  const sequential = countSnap.size + 1;

  const academicYear = body.academicYear ?? getCurrentAcademicYear();
  const studentCode  = generateStudentCode(school.abbreviation, academicYear, sequential);
  const regNumber    = generateRegistrationNumber(school.code, academicYear, sequential);

  const now = Timestamp.now();

  const student: Omit<Student, "id"> = {
    schoolId,
    classId:            body.classId,
    levelId:            body.levelId,
    studentCode,
    registrationNumber: regNumber,
    firstName:          body.firstName,
    lastName:           body.lastName,
    fullName:           `${body.lastName.toUpperCase()} ${body.firstName}`,
    dateOfBirth:        body.dateOfBirth ? Timestamp.fromDate(new Date(body.dateOfBirth)) : now,
    gender:             body.gender,
    photoUrl:           null,
    parentName:         body.parentName ?? "",
    parentPhone:        body.parentPhone ?? "",
    parentEmail:        body.parentEmail ?? null,
    academicYear,
    status:             "active",
    enrolledAt:         now,
    createdAt:          now,
    updatedAt:          now,
  };

  const ref = await adminDb
    .collection("schools").doc(schoolId)
    .collection("students")
    .add(student);

  // Update student count on school
  await adminDb.collection("schools").doc(schoolId).update({
    studentCount: countSnap.size + 1,
  });

  return NextResponse.json({ id: ref.id, ...student }, { status: 201 });
}
