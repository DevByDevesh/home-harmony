import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthField, AuthNotice, AuthShell } from "@/components/auth-shell";
import { authClient, authErrorMessage } from "@/lib/auth/auth-client";

const search = z.object({ token: z.string().optional(), error: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  validateSearch: search,
  head: () => ({ meta: [
    { title: "Choose a new password — HouseProvider.in" },
    { name: "description", content: "Set a new password for your HouseProvider.in account." },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error: resetError } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(
    resetError || (!token ? "This password reset link is missing or invalid." : null),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This password reset link is missing or invalid.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) {
        setError(authErrorMessage(err));
        return;
      }
      setPassword("");
      setConfirm("");
      setDone(true);
      setTimeout(() => void navigate({ to: "/login", replace: true }), 1200);
    } catch {
      setError(authErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return <AuthShell kicker="PASSWORD RESET" title={<>Choose a <em>new password.</em></>} lede="Use a strong password you don't reuse on another site.">
    {done && <AuthNotice tone="success">Your password has been reset. Taking you to sign in…</AuthNotice>}
    {error && <AuthNotice tone="error">{error}</AuthNotice>}
    {!done && token && <form className="auth-form" onSubmit={submit} noValidate>
      <AuthField label="New password" name="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={10} required/>
      <AuthField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={10} required/>
      <Button type="submit" className="auth-submit" disabled={busy}>{busy ? "Resetting…" : "Reset password"}</Button>
    </form>}
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </AuthShell>;
}
