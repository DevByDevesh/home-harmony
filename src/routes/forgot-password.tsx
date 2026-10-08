import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn(value => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function requestReset() {
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(authErrorMessage(err));
        return false;
      }
      setSent(true);
      setResendIn(60);
      return true;
    } catch {
      setError(authErrorMessage(null));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter the email address on your HouseProvider account.");
      return;
    }
    await requestReset();
  }

  return <AuthShell kicker="PASSWORD RESET" title={<>Forgot your <em>password?</em></>} lede="We'll send a secure password reset link to your email.">
    {sent && <AuthNotice tone="success">If an account uses that email, a password reset link has been sent. Check your inbox and spam folder.</AuthNotice>}
    {error && <AuthNotice tone="error">{error}</AuthNotice>}
    {!sent && <form className="auth-form" onSubmit={submit} noValidate>
      <AuthField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required/>
      <Button type="submit" className="auth-submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</Button>
    </form>}
    {sent && <div className="auth-form" style={{ gap: "10px" }}>
      <Button type="button" className="auth-submit" onClick={() => void requestReset()} disabled={busy || resendIn > 0}>
        {busy ? "Sending…" : resendIn > 0 ? `Resend link in ${resendIn}s` : "Resend reset link"}
      </Button>
      <p className="auth-switch">Didn't receive it? Check spam, then resend when the timer ends.</p>
    </div>}
    <p className="auth-switch">Remembered it? <Link to="/login">Back to sign in</Link></p>
  </AuthShell>;
}
