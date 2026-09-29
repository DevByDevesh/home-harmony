import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthNotice } from "@/components/auth-shell";
import { guardArea } from "@/lib/auth/route-guard";
import { roleLabel } from "@/lib/auth/roles";
import { useSignOut } from "@/lib/auth/use-current-user";

const areaName = { owner: "the owner dashboard", agent: "the agent CRM", admin: "the admin area", dashboard: "the dashboard" } as const;

export const Route = createFileRoute("/account")({
  validateSearch: z.object({ denied: z.enum(["owner", "agent", "admin", "dashboard"]).optional() }),
  beforeLoad: guardArea("dashboard"),
  head: () => ({ meta: [
    { title: "Your account — HouseProvider.in" }, { name: "description", content: "Your HouseProvider.in profile and account details." },
    { property: "og:title", content: "Your account — HouseProvider.in" }, { property: "og:description", content: "Your HouseProvider.in profile." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const { denied } = Route.useSearch();
  const signOut = useSignOut();
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return <main className="wrap account-page">
    {denied && <div className="account-denied"><ShieldAlert size={20}/><div><strong>You don't have access to {areaName[denied]}.</strong><p>Your account is a {roleLabel[user.role]} account. Access to owner, agent and admin tools is granted by the HouseProvider team.</p></div></div>}
    <p className="kicker">YOUR ACCOUNT</p>
    <h1>{user.name || "Your profile"}</h1>
    <dl className="account-grid">
      <div><dt>Email</dt><dd>{user.email ?? "—"}</dd></div>
      <div><dt>Phone</dt><dd>{user.phone ?? "Not added"}</dd></div>
      <div><dt>Account type</dt><dd>{roleLabel[user.role]}</dd></div>
      <div><dt>Status</dt><dd>{user.status.toLowerCase()}</dd></div>
      <div><dt>Email verified</dt><dd>{user.emailVerified ? "Yes" : "Not yet — email verification isn't switched on"}</dd></div>
      <div><dt>Member since</dt><dd>{fmt(user.createdAt)}</dd></div>
    </dl>
    <AuthNotice tone="info">Your saved homes, comparisons and visit plans are still stored on this device for now. They'll move to your account in a later update.</AuthNotice>
    <div className="account-actions"><Button asChild><Link to="/dashboard">Go to dashboard</Link></Button><Button variant="outline" onClick={signOut}>Sign out</Button></div>
  </main>;
}
