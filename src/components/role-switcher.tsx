import { useNavigate, useRouterState } from "@tanstack/react-router";
import { roleInfo, setDemoRole, type Role } from "@/lib/roles";
import { AREA_ROLES } from "@/lib/auth/roles";
import { useCurrentUser } from "@/lib/auth/use-current-user";

/**
 * Demo-only shortcut between dashboards. It is NOT authentication and grants nothing:
 * it only lists areas the signed-in account can already open, and every area is
 * re-checked on the server.
 */
export function RoleSwitcher() {
  const navigate = useNavigate(); const { user } = useCurrentUser();
  const path = useRouterState({ select: s => s.location.pathname });
  if (!user) return null;
  const options: Role[] = (["USER", "OWNER", "AGENT", "ADMIN"] as Role[]).filter(r => {
    const area = r === "USER" ? "dashboard" : r === "OWNER" ? "owner" : r === "AGENT" ? "agent" : "admin";
    return AREA_ROLES[area].includes(user.role);
  });
  if (options.length < 2) return null;
  const current = path.startsWith("/owner") ? "OWNER" : path.startsWith("/agent") ? "AGENT" : path.startsWith("/admin") ? "ADMIN" : "USER";
  return <div className="role-switch" role="group" aria-label="Switch dashboard view">
    <span>View</span>
    {options.map(r => <button key={r} type="button" aria-pressed={current === r} onClick={() => { setDemoRole(r); const home = roleInfo[r].home; if (home) navigate({ to: home }); }}>{roleInfo[r].label}</button>)}
  </div>;
}
export function ListingStatusPill({ status }: { status: string }) {
  return <span className={`lstatus lstatus-${status.toLowerCase()}`}>{status.replace("_", " ").toLowerCase()}</span>;
}



