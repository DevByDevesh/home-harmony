import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AuthField, AuthNotice, AuthShell } from "@/components/auth-shell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Reset your password — HouseProvider.in" },
    { name: "description", content: "Password reset for HouseProvider.in accounts." },
    { property: "og:title", content: "Reset your password — HouseProvider.in" },
    { property: "og:description", content: "Password reset for HouseProvider.in accounts." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ForgotPage,
});

/** Architecture only: no email provider is connected, so nothing is sent and no success is implied. */
function ForgotPage() {
  return <AuthShell kicker="PASSWORD RESET" title={<>Forgot your <em>password?</em></>} lede="Resetting by email will be available once email delivery is connected.">
    <AuthNotice tone="info">Password reset emails aren't available yet. No email will be sent from this page.</AuthNotice>
    <form className="auth-form" onSubmit={e => e.preventDefault()} aria-disabled="true">
      <AuthField label="Email" name="email" type="email" autoComplete="email" disabled/>
      <Button type="submit" className="auth-submit" disabled>Send reset link</Button>
    </form>
    <p className="auth-switch">Remembered it? <Link to="/login">Back to sign in</Link></p>
  </AuthShell>;
}
