import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  MessageSquare,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthNotice } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth/auth.functions";
import { safeRedirect } from "@/lib/auth/redirect";
import { getRoleDashboardPath, roleLabel } from "@/lib/auth/roles";
import { getFreeOfferState } from "@/lib/subscription-offer";
import { useSignOut } from "@/lib/auth/use-current-user";
import { claimFreeSixMonthsFn } from "@/lib/subscription.functions";
import { useState } from "react";
import { ProfilePhotoEditor } from "@/components/profile-photo-editor";

const areaName = {
  owner: "the owner dashboard",
  ownerCompany: "the company owner dashboard",
  agent: "the agent CRM",
  admin: "the admin area",
  dashboard: "the dashboard",
} as const;

export const Route = createFileRoute("/account")({
  validateSearch: z.object({
    denied: z.enum(["owner", "ownerCompany", "agent", "admin", "dashboard"]).optional(),
  }),
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: safeRedirect(location.href) } });
    return { user };
  },
  head: () => ({
    meta: [
      { title: "Your account — HouseProvider.in" },
      { name: "description", content: "Your HouseProvider.in profile and account details." },
      { property: "og:title", content: "Your account — HouseProvider.in" },
      { property: "og:description", content: "Your HouseProvider.in profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const { denied } = Route.useSearch();
  const dashboardPath = getRoleDashboardPath(user.role);
  const dashboardLabel =
    dashboardPath === "/owner"
      ? "Go to owner dashboard"
      : dashboardPath === "/admin"
        ? "Go to admin dashboard"
        : dashboardPath === "/dashboard"
          ? "Go to dashboard"
          : "Back to account";
  const signOut = useSignOut();
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(user.verifiedBadge);
  const offerState = getFreeOfferState(user.verifiedBadge || claimSuccess);
  const claimFree = async () => {
    setClaiming(true);
    setClaimMessage(null);
    try {
      const result = await claimFreeSixMonthsFn();
      if (result.ok) {
        setClaimSuccess(true);
        setClaimMessage(
          `6 months free claimed. Your subscription is active until ${fmt(result.renewsAt)}.`,
        );
      } else setClaimMessage(result.message);
    } catch (e) {
      setClaimMessage(e instanceof Error ? e.message : "Could not claim the offer.");
    } finally {
      setClaiming(false);
    }
  };
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <main className="wrap account-page">
      {denied && (
        <div className="account-denied">
          <ShieldAlert size={20} />
          <div>
            <strong>You don't have access to {areaName[denied]}.</strong>
            <p>
              Your account is a {roleLabel[user.role]} account. Access to owner, agent and admin
              tools is granted by the HouseProvider team.
            </p>
          </div>
        </div>
      )}
      <p className="kicker">YOUR ACCOUNT</p>
      <div className="account-title">
        <h1>{user.name || "Your profile"}</h1>
        {offerState.badge && (
          <span
            className="verified-badge"
            title="Verified HouseProvider member"
            aria-label="Verified HouseProvider member"
          >
            <BadgeCheck size={22} />
            <span>Verified</span>
          </span>
        )}
      </div>
      <ProfilePhotoEditor initialImage={user.image} name={user.name} />
      <dl className="account-grid">
        <div>
          <dt>Email</dt>
          <dd>{user.email ?? "—"}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{user.phone ?? "Not added"}</dd>
        </div>
        <div>
          <dt>Account type</dt>
          <dd>{roleLabel[user.role]}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{user.status.toLowerCase()}</dd>
        </div>
        <div>
          <dt>Email verified</dt>
          <dd>{user.emailVerified ? "Yes" : "Not yet — email verification isn't switched on"}</dd>
        </div>
        <div>
          <dt>Member since</dt>
          <dd>{fmt(user.createdAt)}</dd>
        </div>
      </dl>
      <AuthNotice tone="info">
        Your saved homes, comparisons and visit plans are linked to your HouseProvider account.
      </AuthNotice>
      <section className="dash-panel" aria-labelledby="free-six-months">
        <p className="kicker">LIMITED MEMBER OFFER</p>
        <h2 id="free-six-months">Claim 6 Months Free</h2>
        <p>
          Get six months of HouseProvider membership at <strong>₹0</strong>. No payment is required
          to claim this offer.
        </p>
        <div className="subscription-benefits">
          <div>
            <CalendarClock size={18} />
            <span>
              <strong>6 months active</strong>
              <small>Membership is active for six months from the day you claim.</small>
            </span>
          </div>
          <div>
            <Building2 size={18} />
            <span>
              <strong>Property listing access</strong>
              <small>The free plan has no configured listing limit.</small>
            </span>
          </div>
          <div>
            <MessageSquare size={18} />
            <span>
              <strong>Enquiries & messaging</strong>
              <small>Manage seeker enquiries and conversations from your account.</small>
            </span>
          </div>
          <div>
            <BadgeCheck size={18} />
            <span>
              <strong>Verification workflow</strong>
              <small>Submit listings for HouseProvider review and verification.</small>
            </span>
          </div>
          <div>
            <Sparkles size={18} />
            <span>
              <strong>₹0 promotional plan</strong>
              <small>No payment is required during the six-month free period.</small>
            </span>
          </div>
        </div>
        <p className="subscription-note">
          One claim per account. The offer ends on the date shown after claiming.
        </p>
        {offerState.showClaim ? (
          <div className="account-actions offer-actions">
            <Button onClick={() => void claimFree()} disabled={claiming}>
              {claiming ? "Claiming…" : "Claim 6 Months Free"}
            </Button>
          </div>
        ) : (
          <AuthNotice tone="success">
            <span className="verified-offer-message">
              <BadgeCheck size={16} /> 6-month offer claimed · your profile is now verified.
            </span>
          </AuthNotice>
        )}
        {claimMessage && !offerState.showClaim && !claimSuccess && (
          <p className="form-hint" role="alert">
            {claimMessage}
          </p>
        )}
      </section>
      <div className="account-actions">
        <Button asChild>
          <Link to={dashboardPath}>{dashboardLabel}</Link>
        </Button>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
