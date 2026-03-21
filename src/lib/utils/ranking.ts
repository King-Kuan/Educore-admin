import type { LetterGrade } from "@/lib/types";
import { calculateGrade } from "./grading";

export interface StudentScore {
  studentId: string; fullName: string;
  totalScore: number; totalMax: number;
  conductScore: number; grandTotal: number; grandMax: number;
}

export interface RankedStudent extends StudentScore {
  percentage: number; grade: LetterGrade; position: number; isTied: boolean;
}

export function rankStudents(students: StudentScore[]): RankedStudent[] {
  if (students.length === 0) return [];

  const sorted = [...students].sort((a, b) => {
    if (b.grandTotal !== a.grandTotal) return b.grandTotal - a.grandTotal;
    return a.fullName.localeCompare(b.fullName);
  });

  const ranked: RankedStudent[] = [];
  let currentPosition = 1;

  for (let i = 0; i < sorted.length; i++) {
    const student = sorted[i]!;
    const prev    = i > 0 ? sorted[i - 1] : null;
    const isTied  = prev !== null && student.grandTotal === prev.grandTotal;
    if (!isTied) currentPosition = i + 1;

    const percentage  = student.grandMax > 0
      ? parseFloat(((student.grandTotal / student.grandMax) * 100).toFixed(2))
      : 0;

    ranked.push({
      ...student,
      percentage,
      grade:    calculateGrade(student.grandTotal, student.grandMax).grade,
      position: currentPosition,
      isTied,
    });
  }

  return ranked;
}

export function rankStudentsAnnually(termRankings: { term: 1|2|3; students: RankedStudent[] }[]) {
  const allIds = new Set<string>();
  termRankings.forEach((t) => t.students.forEach((s) => allIds.add(s.studentId)));

  const combined = Array.from(allIds).map((studentId) => {
    const t1 = termRankings.find((t) => t.term === 1)?.students.find((s) => s.studentId === studentId);
    const t2 = termRankings.find((t) => t.term === 2)?.students.find((s) => s.studentId === studentId);
    const t3 = termRankings.find((t) => t.term === 3)?.students.find((s) => s.studentId === studentId);

    const annualTotal = (t1?.grandTotal ?? 0) + (t2?.grandTotal ?? 0) + (t3?.grandTotal ?? 0);
    const singleMax   = t1?.grandMax ?? t2?.grandMax ?? t3?.grandMax ?? 0;
    const annualMax   = singleMax * 3;
    const annualPct   = annualMax > 0 ? parseFloat(((annualTotal / annualMax) * 100).toFixed(2)) : 0;

    return {
      studentId, term1Total: t1?.grandTotal ?? 0, term2Total: t2?.grandTotal ?? 0,
      term3Total: t3?.grandTotal ?? 0, annualTotal, annualMax, annualPercentage: annualPct,
      annualGrade: calculateGrade(annualTotal, annualMax).grade, annualPosition: 0,
    };
  });

  combined.sort((a, b) => b.annualTotal - a.annualTotal);
  let pos = 1;
  combined.forEach((s, i) => {
    if (i > 0 && s.annualTotal !== (combined[i - 1]?.annualTotal ?? -1)) pos = i + 1;
    s.annualPosition = pos;
  });

  return combined;
}
