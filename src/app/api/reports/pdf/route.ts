import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api";
import { generateReportPDF } from "@/lib/pdf/ReportTemplate";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentAcademicYear } from "@/lib/utils/helpers";

// GET /api/reports/pdf?schoolId=&classId=&studentId=&term=&academicYear=
export async function GET(request: Request) {
  const { claims, error } = await requireRole("principal", "deputy", "superadmin");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const schoolId    = searchParams.get("schoolId") ?? claims!.schoolId;
  const classId     = searchParams.get("classId")!;
  const studentId   = searchParams.get("studentId");
  const termParam   = searchParams.get("term") ?? "1";
  const academicYear = searchParams.get("academicYear") ?? getCurrentAcademicYear();
  const term        = termParam === "annual" ? "annual" : parseInt(termParam);

  if (!schoolId || !classId) {
    return NextResponse.json({ error: "schoolId and classId required" }, { status: 400 });
  }

  // Call the generate endpoint internally
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  const genRes  = await fetch(`${baseUrl}/api/reports/generate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "Cookie": request.headers.get("Cookie") ?? "" },
    body:    JSON.stringify({ schoolId, classId, term, academicYear, studentId }),
  });

  if (!genRes.ok) {
    return NextResponse.json({ error: "Failed to generate report data" }, { status: 500 });
  }

  const data = await genRes.json();

  // Get school + class docs for header
  const [schoolDoc, classDoc] = await Promise.all([
    adminDb.collection("schools").doc(schoolId!).get(),
    adminDb.collection("schools").doc(schoolId!).collection("classes").doc(classId).get(),
  ]);

  const school = { id: schoolDoc.id, ...schoolDoc.data() };
  const cls    = { id: classDoc.id,  ...classDoc.data() };

  // Get class teacher name
  if (cls["classTeacherId"]) {
    const tchrDoc = await adminDb.collection("users").doc(cls["classTeacherId"] as string).get();
    (cls as Record<string, unknown>)["classTeacherName"] = tchrDoc.data()?.["displayName"] ?? "";
  }

  const students = data.students as unknown[];
  if (!students || students.length === 0) {
    return NextResponse.json({ error: "No students found" }, { status: 404 });
  }

  // If single student → single PDF
  // If bulk → would ZIP them; for now return first one
  const targetStudents = studentId
    ? students.filter((s: unknown) => (s as Record<string, unknown>)["studentId"] === studentId || (s as Record<string, unknown>)["student"] != null)
    : students;

  // Build PDF for first student (bulk will iterate)
  const studentData = targetStudents[0] as Record<string, unknown>;
  const stu = (studentData["student"] ?? {
    id:                 studentData["studentId"],
    fullName:           (studentData as Record<string, unknown>)["fullName"] ?? "",
    registrationNumber: (studentData as Record<string, unknown>)["registrationNumber"] ?? "",
  }) as Record<string, unknown>;

  const pdfBuffer = await generateReportPDF({
    student:         stu,
    school,
    class:           cls,
    subjects:        data.subjects ?? [],
    term:            term === "annual" ? "annual" : term as 1 | 2 | 3,
    academicYear,
    termData:        data.type === "progressive" ? studentData as never : undefined,
    t1:              data.type === "annual" ? (studentData as Record<string, unknown>)["term1"] as never : undefined,
    t2:              data.type === "annual" ? (studentData as Record<string, unknown>)["term2"] as never : undefined,
    t3:              data.type === "annual" ? (studentData as Record<string, unknown>)["term3"] as never : undefined,
    annualTotal:     (studentData["annualTotal"] as number)     ?? 0,
    annualMax:       (studentData["annualMax"] as number)       ?? 0,
    annualPercentage:(studentData["annualPercentage"] as number) ?? 0,
    annualGrade:     (studentData["annualGrade"] as string)     ?? "F",
    annualPosition:  (studentData["annualPosition"] as number)  ?? 0,
    firstDecision:   (studentData["firstDecision"] as string)   ?? "repeat",
    finalDecision:   (studentData["finalDecision"] as string)   ?? "repeat",
    totalStudents:   data.totalStudents ?? students.length,
  });

  const studentName = (stu["fullName"] as string ?? "student").replace(/\s+/g, "_");
  const filename    = `${studentName}_${termParam}_${academicYear}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length":      String(pdfBuffer.length),
    },
  });
}
