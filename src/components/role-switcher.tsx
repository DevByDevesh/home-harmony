import { useNavigate } from "@tanstack/react-router";
import { previewableRoles, roleInfo, setDemoRole, useDemoRole } from "@/lib/roles";

/** Demo-mode view switcher. Not authentication: it grants no permissions. */
export function RoleSwitcher() {
  const role = useDemoRole(); const navigate = useNavigate();
  return <div className="role-switch" role="group" aria-label="Preview dashboard as (demo mode)">
    <span>Demo view</span>
    {previewableRoles.map(r => <button key={r} type="button" aria-pressed={role === r} onClick={() => { setDemoRole(r); const home = roleInfo[r].home; if (home) navigate({ to: home }); }}>{roleInfo[r].label}</button>)}
  </div>;
}
export function ListingStatusPill({ status }: { status: string }) {
  return <span className={`lstatus lstatus-${status.toLowerCase()}`}>{status.replace("_", " ").toLowerCase()}</span>;
}
