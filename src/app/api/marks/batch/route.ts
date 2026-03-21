import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSession } from "@/lib/api";
import { calculateGrade } from "@/lib/utils/grading";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentAcademicYear, getCurrentTerm } from "@/lib/utils/helpers";

// POST /api/marks/batch
// Body: { schoolId, classId, subjectId, term, academicYear, scores: { [studentId]: { ca, exam } } }
export async function POST(request: Request) {
  const { claims, error } = await getSession();
  if (error) return error;

  const body = await request.json();
  const schoolId     = claims!.schoolId ?? body.schoolId;
  const { classId, subjectId, term, academicYear, scores } = body;

  if (!schoolId || !classId || !subjectId || !scores) {
    return NextResponse.json({ error: "schoolId, classId, subjectId, scores required" }, { status: 400 });
  }

  // Get subject max marks
  const subjectDoc = await adminDb.collection("schools").doc(schoolId)
    .collection("subjects").doc(subjectId).get();
  const subject = subjectDoc.data();
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const caMaxSubj   = subject["caMax"]   as number ?? 0;
  const examMaxSubj = subject["examMax"] as number ?? 0;
  const totalMax    = caMaxSubj + examMaxSubj;

  // Get level grading type
  const levelDoc = await adminDb.collection("schools").doc(schoolId)
    .collection("schoolLevels").doc(subject["levelId"]).get();
  const gradingType = (levelDoc.data()?.["gradingType"] ?? "percentage") as "percentage" | "descriptors";

  const termNum  = term ?? getCurrentTerm();
  const yearStr  = academicYear ?? getCurrentAcademicYear();
  const now      = Timestamp.now();
  const batch    = adminDb.batch();

  const entries = Object.entries(scores as Record<string, { ca: number | ""; exam: number | "" }>);

  for (const [studentId, score] of entries) {
    if (score.ca === "" && score.exam === "") continue;

    const caScore   = score.ca   === "" ? 0 : Number(score.ca);
    const examScore = score.exam === "" ? 0 : Number(score.exam);
    const total     = caScore + examScore;
    const pct       = totalMax > 0 ? parseFloat(((total / totalMax) * 100).toFixed(2)) : 0;
    const { grade } = calculateGrade(total, totalMax, gradingType);

    // Check if mark already exists
    const existing = await adminDb.collection("schools").doc(schoolId)
      .collection("marks")
      .where("studentId",   "==", studentId)
      .where("subjectId",   "==", subjectId)
      .where("term",        "==", termNum)
      .where("academicYear","==", yearStr)
      .limit(1).get();

    const markData = {
      schoolId, studentId, subjectId, classId,
      teacherId:    claims!.uid,
      term:         termNum,
      academicYear: yearStr,
      caScore, examScore, totalScore: total,
      percentage:   pct, grade,
      isLocked:     false,
      lockedAt:     null, lockedBy: null,
      updatedAt:    now,
    };

    if (!existing.empty && !existing.docs[0]!.data()["isLocked"]) {
      batch.update(existing.docs[0]!.ref, markData);
    } else if (existing.empty) {
      const ref = adminDb.collection("schools").doc(schoolId).collection("marks").doc();
      batch.set(ref, { ...markData, submittedAt: now });
    }
  }

  await batch.commit();
  return NextResponse.json({ saved: entries.length });
}
