import { cookies } from "next/headers";
import { adminDb, verifyIdToken } from "@/lib/firebase/admin";
import {
  Users, BookOpen, GraduationCap, BarChart3,
  AlertCircle, CheckCircle2, Clock,
} from "lucide-react";

async function getSchoolId(): Promise<string> {
  const cookieStore = await cookies();
  const token       = cookieStore.get("__session")?.value;
  if (!token) throw new Error("Not authenticated");
  const decoded = await verifyIdToken(token);
  return decoded["schoolId"] as string;
}

async function getDashboardData(schoolId: string) {
  const [
    studentsSnap,
    teachersSnap,
    classesSnap,
    schoolSnap,
  ] = await Promise.all([
    adminDb.collection("schools").doc(schoolId)
      .collection("students")
      .where("status", "==", "active")
      .get(),
    adminDb.collection("users")
      .where("schoolId", "==", schoolId)
      .where("role", "==", "teacher")
      .get(),
    adminDb.collection("schools").doc(schoolId)
      .collection("classes")
      .get(),
    adminDb.collection("schools").doc(schoolId).get(),
  ]);

  const school = schoolSnap.data();

  // Count marks submitted this term
  const currentTerm = getCurrentTerm();
  const currentYear = getCurrentYear();

  const marksSnap = await adminDb
    .collection("schools").doc(schoolId)
    .collection("marks")
    .where("term", "==", currentTerm)
    .where("academicYear", "==", currentYear)
    .get();

  return {
    schoolName:    school?.name ?? "School",
    studentCount:  studentsSnap.size,
    teacherCount:  teachersSnap.size,
    classCount:    classesSnap.size,
    marksEntered:  marksSnap.size,
    currentTerm,
    currentYear,
    subscriptionStatus: school?.subscriptionStatus ?? "active",
  };
}

function getCurrentTerm(): number {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  return 3;
}

function getCurrentYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export default async function PrincipalPage() {
  const schoolId = await getSchoolId();
  const data     = await getDashboardData(schoolId);

  const stats = [
    {
      label: "Students",
      value: data.studentCount,
      sub:   "Active enrolment",
      icon:  <GraduationCap className="w-5 h-5" />,
      color: "bg-brand-600",
      href:  "/principal/students",
    },
    {
      label: "Teachers",
      value: data.teacherCount,
      sub:   "Active staff",
      icon:  <Users className="w-5 h-5" />,
      color: "bg-blue-600",
      href:  "/principal/teachers",
    },
    {
      label: "Classes",
      value: data.classCount,
      sub:   `Academic year ${data.currentYear}`,
      icon:  <BookOpen className="w-5 h-5" />,
      color: "bg-violet-600",
      href:  "/principal/classes",
    },
    {
      label: "Marks Entered",
      value: data.marksEntered,
      sub:   `Term ${data.currentTerm} submissions`,
      icon:  <BarChart3 className="w-5 h-5" />,
      color: "bg-emerald-600",
      href:  "/principal/marks",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{data.schoolName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Term {data.currentTerm} · {data.currentYear}
          </p>
        </div>
        {data.subscriptionStatus !== "active" && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            Subscription {data.subscriptionStatus}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <a key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className={`${s.color} w-9 h-9 rounded-lg flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
                {s.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">{s.value}</div>
            <div className="text-sm font-medium text-gray-600">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: "Import students from CSV",  href: "/principal/students?import=1",  icon: <GraduationCap className="w-4 h-4" /> },
              { label: "Generate term reports",      href: "/principal/reports",             icon: <BarChart3 className="w-4 h-4" /> },
              { label: "Build class timetable",      href: "/principal/timetable",           icon: <Clock className="w-4 h-4" /> },
              { label: "Lock marks for Term " + data.currentTerm, href: "/principal/marks?lock=1", icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors border border-gray-100"
              >
                <span className="text-gray-400">{a.icon}</span>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Term {data.currentTerm} Progress</h3>
          <div className="space-y-3">
            {[
              { label: "Classes created",   done: data.classCount > 0,   count: data.classCount },
              { label: "Students imported", done: data.studentCount > 0, count: data.studentCount },
              { label: "Marks submitted",   done: data.marksEntered > 0, count: data.marksEntered },
              { label: "Reports generated", done: false, count: 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                {item.done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <div className="w-4 h-4 border-2 border-gray-200 rounded-full flex-shrink-0" />
                }
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                <span className="text-xs font-mono text-gray-400">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
