import { guardArea } from "@/lib/auth/route-guard";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BarChart3, BadgeCheck, Building2, CalendarCheck, ClipboardList, CreditCard, Flag, Gauge, Layers, Menu, MessagesSquare, Settings, ShieldCheck, Users, Briefcase, UserCog, Wrench } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AdminLoadingState } from "@/components/admin/admin-kit";
import { RoleSwitcher } from "@/components/role-switcher";
import { roleInfo, setDemoRole, useDemoRoleState } from "@/lib/roles";
import { isAdminRole } from "@/lib/admin/permissions";

export const Route = createFileRoute("/admin")({
  beforeLoad: guardArea("admin"),
  head: () => ({ meta: [
    { title: "Admin — HouseProvider.in" }, { name: "robots", content: "noindex, nofollow" },
    { name: "description", content: "Private HouseProvider operations area." },
  ] }),
  component: AdminLayout,
});

const groups = [
  [["/admin", "Overview", Gauge]],
  [["/admin/users", "Users", Users], ["/admin/owners", "Owners", UserCog], ["/admin/agents", "Agents", Briefcase]],
  [["/admin/properties", "Properties", Building2], ["/admin/verification", "Verification", BadgeCheck], ["/admin/reports", "Reports", Flag]],
  [["/admin/enquiries", "Enquiries", MessagesSquare], ["/admin/visits", "Visits", CalendarCheck]],
  [["/admin/payments", "Payments", CreditCard], ["/admin/subscriptions", "Subscriptions", Layers]],
  [["/admin/services", "Services", Wrench]],
  [["/admin/analytics", "Analytics", BarChart3]],
  [["/admin/settings", "Settings", Settings], ["/admin/audit", "Audit log", ClipboardList]],
] as const;

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return <nav className="admin-nav" aria-label="Admin navigation">{groups.map((g, i) => <div key={i} className="admin-nav-group">{g.map(([to, label, Icon]) =>
    <Link key={to} to={to} activeOptions={{ exact: true }} activeProps={{ "aria-current": "page" }} onClick={onNavigate}><Icon size={16}/>{label}</Link>)}</div>)}</nav>;
}

function AdminLayout() {
  const { role, ready } = useDemoRoleState();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: s => s.location.pathname });
  if (!ready) return <main className="admin-page wrap"><AdminLoadingState label="Checking access"/></main>;
  if (!isAdminRole(role)) return <main className="admin-page wrap admin-gate">
    <ShieldCheck size={34}/><p className="kicker">RESTRICTED</p><h1>Admin access required</h1>
    <p>This area is for HouseProvider operations staff. You are viewing as <strong>{roleInfo[role].label}</strong>, which has no admin permissions.</p>
    <p className="form-hint">Demo mode: sign-in doesn't exist yet, so you can preview the admin area below. Real access will be enforced by the server.</p>
    <div className="fallback-actions"><Button onClick={() => setDemoRole("ADMIN")}>Preview as Admin (demo)</Button><Button variant="outline" onClick={() => setDemoRole("SUPER_ADMIN")}>Preview as Super admin (demo)</Button><Button asChild variant="ghost"><Link to="/">Go home</Link></Button></div>
  </main>;
  return <main className="admin-page wrap">
    <div className="admin-topbar"><Button variant="outline" size="sm" className="admin-menu-btn" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu size={16}/> Menu</Button><RoleSwitcher/></div>
    <div className="admin-layout">
      <aside className="admin-aside"><p className="admin-aside-title">Operations · {roleInfo[role].label}</p><AdminSidebar/></aside>
      <div className="admin-main" key={path}><Outlet/></div>
    </div>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent side="left" className="admin-drawer"><SheetTitle>Admin</SheetTitle><SheetDescription className="sr-only">Admin sections</SheetDescription><AdminSidebar onNavigate={() => setOpen(false)}/></SheetContent></Sheet>
  </main>;
}
