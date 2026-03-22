import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/api";
import { rankStudents, rankStudentsAnnually } from "@/lib/utils/ranking";
import { calculateGrade, determineDecision } from "@/lib/utils/grading";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";
import type { Term } from "@/lib/types";

// POST /api/reports/generate
// Body: { schoolId, classId, term: 1|2|3|"annual", academicYear, studentId? }
export async function POST(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const body        = await request.json();
  const schoolId    = claims!.schoolId ?? body.schoolId;
  const { classId, term, studentId } = body;
  const academicYear = body.academicYear ?? getCurrentAcademicYear();
  const isAnnual     = term === "annual";

  if (!schoolId || !classId) {
    return NextResponse.json({ error: "schoolId and classId required" }, { status: 400 });
  }

  // ── 1. Fetch all base data in parallel ────────────────────────────────

  const [schoolDoc, classDoc, subjectsSnap, studentsSnap] = await Promise.all([
    adminDb.collection("schools").doc(schoolId).get(),
    adminDb.collection("schools").doc(schoolId).collection("classes").doc(classId).get(),
    adminDb.collection("schools").doc(schoolId).collection("subjects")
      .where("levelId", "==", classDoc?.data?.()?.["levelId"] ?? "")
      .orderBy("order")
      .get(),
    adminDb.collection("schools").doc(schoolId).collection("students")
      .where("classId", "==", classId)
      .where("status", "==", "active")
      .orderBy("lastName")
      .get(),
  ]);

  // Re-fetch subjects after we have classDoc
  const levelId = classDoc.data()?.["levelId"] ?? "";
  const subjectsSnap2 = await adminDb
    .collection("schools").doc(schoolId)
    .collection("subjects")
    .where("levelId", "==", levelId)
    .orderBy("order")
    .get();

  const school   = { id: schoolDoc.id, ...schoolDoc.data() };
  const cls      = { id: classDoc.id,  ...classDoc.data()  };
  const subjects = subjectsSnap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (students.length === 0) {
    return NextResponse.json({ error: "No students in class" }, { status: 404 });
  }

  // Get level for grading type
  const levelDoc  = await adminDb.collection("schools").doc(schoolId)
    .collection("schoolLevels").doc(levelId).get();
  const gradingType = (levelDoc.data()?.["gradingType"] ?? "percentage") as "percentage" | "descriptors";

  const termsToProcess: Term[] = isAnnual ? [1, 2, 3] : [term as Term];

  // ── 2. Fetch marks + conduct for all relevant terms ────────────────────

  const allMarksPromises = termsToProcess.map((t) =>
    adminDb.collection("schools").doc(schoolId).collection("marks")
      .where("classId", "==", classId)
      .where("term", "==", t)
      .where("academicYear", "==", academicYear)
      .get()
  );

  const allConductPromises = termsToProcess.map((t) =>
    adminDb.collection("schools").doc(schoolId).collection("conduct")
      .where("classId", "==", classId)
      .where("term", "==", t)
      .where("academicYear", "==", academicYear)
      .get()
  );

  const allAttendancePromises = termsToProcess.map((t) =>
    adminDb.collection("schools").doc(schoolId).collection("attendance")
      .where("classId", "==", classId)
      .where("term", "==", t)
      .where("academicYear", "==", academicYear)
      .get()
  );

  const [marksResults, conductResults, attendanceResults] = await Promise.all([
    Promise.all(allMarksPromises),
    Promise.all(allConductPromises),
    Promise.all(allAttendancePromises),
  ]);

  // ── 3. Build per-term data maps ────────────────────────────────────────

  type TermData = {
    marks:      Map<string, Map<string, { caScore: number; examScore: number; totalScore: number; percentage: number; grade: string }>>;
    conduct:    Map<string, { score: number; grade: string }>;
    attendance: Map<string, { present: number; absent: number; late: number }>;
  };

  const termDataMap = new Map<Term, TermData>();

  termsToProcess.forEach((t, idx) => {
    const marksSnap      = marksResults[idx]!;
    const conductSnap    = conductResults[idx]!;
    const attendSnap     = attendanceResults[idx]!;

    // marks: studentId → subjectId → mark
    const marksMap = new Map<string, Map<string, { caScore: number; examScore: number; totalScore: number; percentage: number; grade: string }>>();
    marksSnap.docs.forEach((d) => {
      const m = d.data();
      if (!marksMap.has(m["studentId"])) marksMap.set(m["studentId"], new Map());
      marksMap.get(m["studentId"])!.set(m["subjectId"], {
        caScore:    m["caScore"]    ?? 0,
        examScore:  m["examScore"]  ?? 0,
        totalScore: m["totalScore"] ?? 0,
        percentage: m["percentage"] ?? 0,
        grade:      m["grade"]      ?? "F",
      });
    });

    // conduct: studentId → score
    const conductMap = new Map<string, { score: number; grade: string }>();
    conductSnap.docs.forEach((d) => {
      const c = d.data();
      conductMap.set(c["studentId"], { score: c["score"] ?? 0, grade: c["grade"] ?? "F" });
    });

    // attendance: studentId → counts
    const attendMap = new Map<string, { present: number; absent: number; late: number }>();
    attendSnap.docs.forEach((d) => {
      const a = d.data();
      const sid = a["studentId"] as string;
      if (!attendMap.has(sid)) attendMap.set(sid, { present: 0, absent: 0, late: 0 });
      const cur = attendMap.get(sid)!;
      if (a["status"] === "present") cur.present++;
      else if (a["status"] === "absent") cur.absent++;
      else if (a["status"] === "late") cur.late++;
    });

    termDataMap.set(t, { marks: marksMap, conduct: conductMap, attendance: attendMap });
  });

  // ── 4. Build student report objects ───────────────────────────────────

  const buildTermReport = (studentId: string, termNum: Term, termData: TermData) => {
    const studentMarks  = termData.marks.get(studentId) ?? new Map();
    const conductInfo   = termData.conduct.get(studentId) ?? { score: 0, grade: "F" };
    const attendInfo    = termData.attendance.get(studentId) ?? { present: 0, absent: 0, late: 0 };

    const subjectResults = subjects.map((subj: Record<string, unknown>) => {
      const m          = studentMarks.get(subj["id"] as string);
      const totalMax   = (subj["caMax"] as number ?? 0) + (subj["examMax"] as number ?? 0);
      const totalScore = m?.totalScore ?? 0;
      const pct        = totalMax > 0 ? parseFloat(((totalScore / totalMax) * 100).toFixed(2)) : 0;
      const gradeRes   = calculateGrade(totalScore, totalMax, gradingType);

      return {
        subjectId:   subj["id"],
        subjectName: subj["name"],
        caMax:       subj["caMax"] ?? 0,
        caScore:     m?.caScore   ?? 0,
        examMax:     subj["examMax"] ?? 0,
        examScore:   m?.examScore  ?? 0,
        totalMax,
        totalScore,
        percentage:  pct,
        grade:       gradeRes.grade,
      };
    });

    const grandTotal = subjectResults.reduce((s, r) => s + r.totalScore, 0) + conductInfo.score;
    const grandMax   = subjectResults.reduce((s, r) => s + r.totalMax,   0) + 40;
    const pct        = grandMax > 0 ? parseFloat(((grandTotal / grandMax) * 100).toFixed(2)) : 0;
    const gradeRes   = calculateGrade(grandTotal, grandMax);

    return {
      studentId,
      term:           termNum,
      academicYear,
      subjects:       subjectResults,
      conductScore:   conductInfo.score,
      conductGrade:   conductInfo.grade,
      grandTotal,
      grandMax,
      percentage:     pct,
      grade:          gradeRes.grade,
      attendance:     attendInfo,
    };
  };

  // Build for each term
  const termReports: Record<number, ReturnType<typeof buildTermReport>[]> = {};

  for (const t of termsToProcess) {
    const data    = termDataMap.get(t)!;
    const reports = students.map((s: Record<string, unknown>) =>
      buildTermReport(s["id"] as string, t, data)
    );

    // Rank students for this term
    const scoreList = reports.map((r) => ({
      studentId:    r.studentId,
      fullName:     (students.find((s: Record<string, unknown>) => s["id"] === r.studentId) as Record<string, unknown>)?.["fullName"] as string ?? "",
      totalScore:   r.grandTotal - r.conductScore,
      totalMax:     r.grandMax   - 40,
      conductScore: r.conductScore,
      grandTotal:   r.grandTotal,
      grandMax:     r.grandMax,
    }));
    const ranked = rankStudents(scoreList);

    // Merge positions
    termReports[t] = reports.map((r) => {
      const rank = ranked.find((rk) => rk.studentId === r.studentId);
      return { ...r, position: rank?.position ?? 0, totalStudents: students.length };
    });
  }

  // ── 5. Build final response ────────────────────────────────────────────

  let responseData: unknown;

  if (isAnnual) {
    // Annual: combine all 3 terms per student
    const annualReports = students.map((s: Record<string, unknown>) => {
      const sid   = s["id"] as string;
      const t1    = termReports[1]?.find((r) => r.studentId === sid);
      const t2    = termReports[2]?.find((r) => r.studentId === sid);
      const t3    = termReports[3]?.find((r) => r.studentId === sid);

      const annualTotal = (t1?.grandTotal ?? 0) + (t2?.grandTotal ?? 0) + (t3?.grandTotal ?? 0);
      const annualMax   = ((t1?.grandMax   ?? 0) + (t2?.grandMax   ?? 0) + (t3?.grandMax   ?? 0)) || (t3?.grandMax ?? 0) * 3;
      const annualPct   = annualMax > 0 ? parseFloat(((annualTotal / annualMax) * 100).toFixed(2)) : 0;
      const annualGrade = calculateGrade(annualTotal, annualMax).grade;
      const decision    = determineDecision(annualPct);

      return {
        student:        s,
        term1:          t1,
        term2:          t2,
        term3:          t3,
        annualTotal,
        annualMax,
        annualPercentage: annualPct,
        annualGrade,
        firstDecision:  decision.firstDecision,
        finalDecision:  decision.firstDecision, // principal can override in UI
        subjects,
      };
    });

    // Annual position ranking
    const annualScores = annualReports.map((r) => ({
      studentId:    r.student["id"] as string,
      fullName:     r.student["fullName"] as string ?? "",
      grandTotal:   r.annualTotal,
      grandMax:     r.annualMax,
      totalScore:   r.annualTotal,
      totalMax:     r.annualMax,
      conductScore: 0,
    }));
    const annualRanked = rankStudents(annualScores);

    responseData = {
      type:         "annual",
      school,
      class:        cls,
      subjects,
      academicYear,
      totalStudents: students.length,
      students:     annualReports.map((r) => {
        const rank = annualRanked.find((rk) => rk.studentId === (r.student["id"] as string));
        return { ...r, annualPosition: rank?.position ?? 0 };
      }),
    };
  } else {
    // Single term
    const t = termsToProcess[0]!;
    const targetStudent = studentId
      ? termReports[t]?.find((r) => r.studentId === studentId)
      : null;

    responseData = {
      type:         "progressive",
      school,
      class:        cls,
      subjects,
      term:         t,
      academicYear,
      totalStudents: students.length,
      students:     studentId && targetStudent
        ? [targetStudent]
        : termReports[t] ?? [],
    };
  }

  return NextResponse.json(responseData);
}
