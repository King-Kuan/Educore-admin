import { DashboardShell } from "@/components/layout/DashboardShell";

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
