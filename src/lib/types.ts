import type { Timestamp } from "firebase/firestore";

export type UserRole = "superadmin" | "principal" | "deputy" | "teacher";
export type UserStatus = "active" | "suspended" | "pending";
export type Term = 1 | 2 | 3;
export type Gender = "M" | "F";
export type StudentStatus = "active" | "transferred" | "graduated" | "withdrawn";
export type PlanType = "flat" | "per_student";
export type SubscriptionStatus = "active" | "expired" | "trial" | "suspended";
export type GradingType = "percentage" | "descriptors";
export type FileType = "homework" | "test" | "exercise" | "resource";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type LetterGrade = "A" | "B" | "C" | "D" | "E" | "S" | "F";
export type DescriptorGrade = "Excellent" | "Very Good" | "Good" | "Satisfactory";
export type DecisionType = "promoted" | "second_sitting" | "repeat" | "discontinued";
export const DEPUTY_PERMISSIONS = [
  { value: "view_marks",       label: "View Marks"       },
  { value: "enter_marks",      label: "Enter Marks"      },
  { value: "lock_marks",       label: "Lock Marks"       },
  { value: "generate_reports", label: "Generate Reports" },
  { value: "manage_students",  label: "Manage Students"  },
  { value: "manage_timetable", label: "Manage Timetable" },
  { value: "manage_files",     label: "Manage Files"     },
  { value: "view_attendance",  label: "View Attendance"  },
];

export type CreatePayload<T> = Omit<T, "id" | "createdAt" | "updatedAt">;

export interface School {
  id: string;
  name: string;
  code: string;
  abbreviation: string;
  logoUrl: string | null;
  email: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  country: string;
  planType: PlanType;
  studentCount: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiry: Timestamp | null;
  approvedAt: Timestamp | null;
  approvedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: UserRole;
  schoolId: string | null;
  permissions: string[];
  status: UserStatus;
  createdAt: Timestamp;
  createdBy: string;
  lastLoginAt: Timestamp | null;
}

export interface SchoolLevel {
  id: string;
  schoolId: string;
  name: string;
  gradingType: GradingType;
  descriptors: DescriptorGrade[];
  passMark: number;
  order: number;
  createdAt: Timestamp;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  levelId: string;
  name: string;
  classTeacherId: string;
  teacherIds: string[];
  academicYear: string;
  capacity: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;
  schoolId: string;
  levelId: string;
  name: string;
  caMax: number;
  examMax: number;
  totalMax: number;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  id: string;
  schoolId: string;
  classId: string;
  levelId: string;
  studentCode: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: Timestamp;
  gender: Gender;
  photoUrl: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail: string | null;
  academicYear: string;
  status: StudentStatus;
  enrolledAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Mark {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  term: Term;
  academicYear: string;
  caScore: number | null;
  examScore: number | null;
  totalScore: number | null;
  percentage: number | null;
  grade: LetterGrade | DescriptorGrade | null;
  isLocked: boolean;
  lockedAt: Timestamp | null;
  lockedBy: string | null;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ConductMark {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  teacherId: string;
  term: Term;
  academicYear: string;
  score: number;
  grade: LetterGrade;
  isLocked: boolean;
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AttendanceRecord {
  id: string;
  schoolId: string;
  classId: string;
  studentId: string;
  teacherId: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
  term: Term;
  academicYear: string;
  createdAt: Timestamp;
}

export interface TimetableSlot {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5;
  startTime: string;
  endTime: string;
  room: string | null;
  term: Term;
  academicYear: string;
  createdAt: Timestamp;
}

export interface UploadedFile {
  id: string;
  schoolId: string;
  folderId: string;
  classId: string;
  subjectId: string | null;
  uploadedBy: string;
  title: string;
  description: string | null;
  type: FileType;
  r2Key: string;
  fileUrl: string | null;
  fileSize: number;
  mimeType: string;
  term: Term;
  academicYear: string;
  uploadedAt: Timestamp;
  expiresAt: Timestamp;
  isDeleted: boolean;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string | null;
  targetAudience: string[];
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdBy: string;
  createdAt: Timestamp;
}

export interface GradingResult {
  grade: LetterGrade;
  descriptor: string;
  percentage: number;
  passed: boolean;
  value: number;
}
