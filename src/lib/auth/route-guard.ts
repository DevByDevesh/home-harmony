import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "./auth.functions";
import { AREA_ROLES, type Area, type AuthRole } from "./roles";

/**
 * Route `beforeLoad` guard. Runs on the server during SSR (reading the HttpOnly
 * session cookie) and on client navigation. Server functions re-check on every call.
 */
export function guardArea(area: Area) {
  return async ({ location }: { location: { href: string } }) => {
    let user = await getCurrentUser();
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 75));
      user = await getCurrentUser();
    }
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
    const allowedRoles = AREA_ROLES[area] as readonly AuthRole[];
    if (!allowedRoles.includes(user.role)) {
      if (area === "authenticated") throw redirect({ to: "/account" });
      throw redirect({ to: "/account", search: { denied: area } });
    }
    return { user };
  };
}
