import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthField, AuthNotice, AuthShell } from "@/components/auth-shell";
import { authClient, authErrorMessage } from "@/lib/auth/auth-client";

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

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter the email address on your HouseProvider account.");
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(authErrorMessage(err));
        return;
      }
      setSent(true);
    } catch {
      setError(authErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return <AuthShell kicker="PASSWORD RESET" title={<>Forgot your <em>password?</em></>} lede="We'll send a secure password reset link to your email.">
    {sent && <AuthNotice tone="success">If an account uses that email, a password reset link has been sent. Check your inbox and spam folder.</AuthNotice>}
    {error && <AuthNotice tone="error">{error}</AuthNotice>}
    {!sent && <form className="auth-form" onSubmit={submit} noValidate>
      <AuthField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required/>
      <Button type="submit" className="auth-submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
    </form>}
    <p className="auth-switch">Remembered it? <Link to="/login">Back to sign in</Link></p>
  </AuthShell>;
}
