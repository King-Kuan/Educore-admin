import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { generateStudentCode, generateRegistrationNumber, getCurrentAcademicYear } from "@/lib/utils/helpers";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId    = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId     = searchParams.get("classId");
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();

  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  try {
    // Get students - no orderBy to avoid composite index requirement
    let snap;
    if (classId) {
      snap = await adminDb
        .collection("schools").doc(schoolId)
        .collection("students")
        .where("academicYear", "==", academicYear)
        .where("status", "==", "active")
        .where("classId", "==", classId)
        .get();
    } else {
      snap = await adminDb
        .collection("schools").doc(schoolId)
        .collection("students")
        .where("academicYear", "==", academicYear)
        .where("status", "==", "active")
        .get();
    }

    const students = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a["lastName"]).localeCompare(String(b["lastName"])));

    return NextResponse.json({ students, total: students.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const schoolId = (claims!.schoolId ?? body["schoolId"]) as string;
  if (!schoolId) return NextResponse.json({ error: "schoolId required" }, { status: 400 });

  const { firstName, lastName, classId, gender = "M" } = body;
  if (!firstName || !lastName || !classId) {
    return NextResponse.json({ error: "firstName, lastName and classId are required" }, { status: 400 });
  }

  try {
    // Get school info
    const schoolDoc = await adminDb.collection("schools").doc(schoolId).get();
    const school    = schoolDoc.data();
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // Get levelId from class if not provided
    let levelId = (body["levelId"] as string) ?? "";
    if (!levelId) {
      const classDoc = await adminDb
        .collection("schools").doc(schoolId)
        .collection("classes").doc(classId as string)
        .get();
      levelId = classDoc.data()?.["levelId"] ?? "";
    }

    // Get next sequential number
    const countSnap = await adminDb
      .collection("schools").doc(schoolId)
      .collection("students")
      .where("academicYear", "==", body["academicYear"] ?? getCurrentAcademicYear())
      .get();
    const sequential = countSnap.size + 1;

    const academicYear  = (body["academicYear"] as string) ?? getCurrentAcademicYear();
    const studentCode   = generateStudentCode(school["abbreviation"] as string ?? "SCH", academicYear, sequential);
    const regNumber     = generateRegistrationNumber(school["code"] as string ?? "001", academicYear, sequential);
    const now           = Timestamp.now();

    const student = {
      schoolId,
      classId:            classId as string,
      levelId,
      studentCode,
      registrationNumber: regNumber,
      firstName:          String(firstName).trim(),
      lastName:           String(lastName).trim().toUpperCase(),
      fullName:           `${String(lastName).trim().toUpperCase()} ${String(firstName).trim()}`,
      dateOfBirth:        body["dateOfBirth"] ? Timestamp.fromDate(new Date(body["dateOfBirth"] as string)) : now,
      gender:             String(gender),
      photoUrl:           null,
      parentName:         String(body["parentName"] ?? ""),
      parentPhone:        String(body["parentPhone"] ?? ""),
      parentEmail:        (body["parentEmail"] as string) ?? null,
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

    // Update school student count
    await adminDb.collection("schools").doc(schoolId).update({
      studentCount: countSnap.size + 1,
    });

    // Update class student count
    try {
      const classRef = adminDb.collection("schools").doc(schoolId).collection("classes").doc(classId as string);
      const classDoc = await classRef.get();
      await classRef.update({ studentCount: (classDoc.data()?.["studentCount"] ?? 0) + 1 });
    } catch { /* non-fatal */ }

    return NextResponse.json({ id: ref.id, studentCode, registrationNumber: regNumber }, { status: 201 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Student creation error:", msg);
    return NextResponse.json({ error: `Failed to create student: ${msg}` }, { status: 500 });
  }
}
