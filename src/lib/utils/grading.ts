import type { LetterGrade, DescriptorGrade, GradingResult, GradingType } from "@/lib/types";

export const GRADE_SCALE = [
  { grade: "A" as LetterGrade, minPct: 80,  maxPct: 100, descriptor: "Excellent",    value: 6 },
  { grade: "B" as LetterGrade, minPct: 75,  maxPct: 79,  descriptor: "Very Good",    value: 5 },
  { grade: "C" as LetterGrade, minPct: 70,  maxPct: 74,  descriptor: "Good",         value: 4 },
  { grade: "D" as LetterGrade, minPct: 65,  maxPct: 69,  descriptor: "Satisfactory", value: 3 },
  { grade: "E" as LetterGrade, minPct: 60,  maxPct: 64,  descriptor: "Adequate",     value: 2 },
  { grade: "S" as LetterGrade, minPct: 50,  maxPct: 59,  descriptor: "Min. Pass",    value: 1 },
  { grade: "F" as LetterGrade, minPct: 0,   maxPct: 49,  descriptor: "Fail",         value: 0 },
];

export function calculateGrade(score: number, maxMarks: number, gradingType: GradingType = "percentage"): GradingResult {
  if (maxMarks <= 0) return { grade: "F", descriptor: "Fail", percentage: 0, passed: false, value: 0 };
  if (score < 0) score = 0;
  if (score > maxMarks) score = maxMarks;

  const percentage = parseFloat(((score / maxMarks) * 100).toFixed(2));

  if (gradingType === "descriptors") {
    if (percentage >= 80) return { grade: "A", descriptor: "Excellent",    percentage, passed: true, value: 6 };
    if (percentage >= 65) return { grade: "B", descriptor: "Very Good",    percentage, passed: true, value: 5 };
    if (percentage >= 50) return { grade: "C", descriptor: "Good",         percentage, passed: true, value: 4 };
    return                       { grade: "S", descriptor: "Satisfactory", percentage, passed: true, value: 1 };
  }

  const found = GRADE_SCALE.find((g) => percentage >= g.minPct && percentage <= g.maxPct);
  const entry = found ?? GRADE_SCALE[GRADE_SCALE.length - 1]!;
  return { grade: entry.grade, descriptor: entry.descriptor, percentage, passed: percentage >= 50, value: entry.value };
}

export function determineDecision(annualPercentage: number) {
  if (annualPercentage >= 50) return { firstDecision: "promoted",       descriptor: "Promoted"          };
  if (annualPercentage >= 40) return { firstDecision: "second_sitting", descriptor: "2nd Sitting"       };
  return                             { firstDecision: "repeat",         descriptor: "Advised to Repeat" };
}

export function calculateGrade(score: number): GradingResult {
  return calculateGrade(score, 40);
}
