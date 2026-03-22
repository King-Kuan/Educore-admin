import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

// POST /api/students/promote
// Body: { schoolId, fromYear, toYear, promotions: [{ studentId, decision, toClassId }] }
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "superadmin");
  if (error) return error;

  const body     = await request.json();
  const schoolId = claims!.schoolId ?? body.schoolId;
  const { fromYear, toYear, promotions } = body;

  if (!schoolId || !fromYear || !toYear || !Array.isArray(promotions)) {
    return NextResponse.json({ error: "schoolId, fromYear, toYear, promotions required" }, { status: 400 });
  }

  if (promotions.length === 0) {
    return NextResponse.json({ error: "No students to process" }, { status: 400 });
  }

  const now     = Timestamp.now();
  const batch   = adminDb.batch();
  const results = { promoted: 0, repeated: 0, discontinued: 0, secondSitting: 0, errors: [] as string[] };

  for (const p of promotions) {
    const { studentId, decision, toClassId } = p;

    if (!studentId || !decision) {
      results.errors.push(`Missing studentId or decision`);
      continue;
    }

    const studentRef = adminDb
      .collection("schools").doc(schoolId)
      .collection("students").doc(studentId);

    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      results.errors.push(`Student ${studentId} not found`);
      continue;
    }

    const student = studentSnap.data()!;

    if (decision === "promoted" && toClassId) {
      // Update student to new class and new academic year
      batch.update(studentRef, {
        classId:      toClassId,
        academicYear: toYear,
        updatedAt:    now,
        status:       "active",
      });

      // Update student count on old class
      if (student["classId"]) {
        const oldClassRef = adminDb
          .collection("schools").doc(schoolId)
          .collection("classes").doc(student["classId"]);
        batch.update(oldClassRef, {
          studentCount: (await oldClassRef.get()).data()?.["studentCount"] ?? 1 - 1,
        });
      }

      // Update student count on new class
      const newClassRef = adminDb
        .collection("schools").doc(schoolId)
        .collection("classes").doc(toClassId);
      const newClassSnap = await newClassRef.get();
      if (newClassSnap.exists) {
        batch.update(newClassRef, {
          studentCount: (newClassSnap.data()?.["studentCount"] ?? 0) + 1,
        });
      }

      results.promoted++;

    } else if (decision === "repeat") {
      // Stay in same class, just update academic year
      batch.update(studentRef, {
        academicYear: toYear,
        updatedAt:    now,
        status:       "active",
      });
      results.repeated++;

    } else if (decision === "second_sitting") {
      // Stay in same class for now
      batch.update(studentRef, {
        academicYear: toYear,
        updatedAt:    now,
        status:       "active",
      });
      results.secondSitting++;

    } else if (decision === "discontinued") {
      // Mark as withdrawn
      batch.update(studentRef, {
        status:    "withdrawn",
        updatedAt: now,
      });
      results.discontinued++;
    }
  }

  await batch.commit();

  return NextResponse.json({
    ok: true,
    fromYear,
    toYear,
    total:   promotions.length,
    results,
    message: `Processed ${promotions.length} students: ${results.promoted} promoted, ${results.repeated} repeating, ${results.secondSitting} 2nd sitting, ${results.discontinued} discontinued`,
  });
}
