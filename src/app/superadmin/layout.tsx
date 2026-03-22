import { DashboardShell } from "@/components/layout/DashboardShell";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
