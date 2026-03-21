// ── Student ID ────────────────────────────────────────────────────────────

export function generateStudentCode(abbrev: string, academicYear: string, sequential: number): string {
  const yearShort = getAcademicYearShort(academicYear);
  return `${abbrev.toUpperCase()}·${yearShort}·${String(sequential).padStart(4, "0")}`;
}

export function generateRegistrationNumber(schoolCode: string, academicYear: string, sequential: number): string {
  const yearShort = getAcademicYearShort(academicYear);
  return `${schoolCode.padStart(3, "0")}${yearShort}${String(sequential).padStart(5, "0")}`;
}

export function getAcademicYearShort(academicYear: string): string {
  const parts = academicYear.split("-");
  if (parts.length !== 2) return academicYear;
  return `${parts[0]!.slice(-2)}${parts[1]!.slice(-2)}`;
}

export function getCurrentAcademicYear(): string {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

export function getCurrentTerm(): 1 | 2 | 3 {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  return 3;
}

// ── Billing ───────────────────────────────────────────────────────────────

export const FLAT_RATE_LIMIT  = 300;
export const FLAT_RATE_AMOUNT = 170_000;
export const PER_STUDENT_RATE = 700;

export function calculateAnnualFee(studentCount: number) {
  if (studentCount <= FLAT_RATE_LIMIT) {
    return { amountRwf: FLAT_RATE_AMOUNT, planType: "flat" as const, breakdown: `Flat rate for up to ${FLAT_RATE_LIMIT} students` };
  }
  return { amountRwf: studentCount * PER_STUDENT_RATE, planType: "per_student" as const, breakdown: `${studentCount} × ${PER_STUDENT_RATE} Rwf` };
}

export function formatRwf(amount: number): string {
  return `${amount.toLocaleString("en-RW")} Rwf`;
}
