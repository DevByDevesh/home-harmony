import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthField, AuthNotice, AuthShell, ProviderRow } from "@/components/auth-shell";
import { authClient, authErrorMessage } from "@/lib/auth/auth-client";
import { safeRedirect } from "@/lib/auth/redirect";
import { currentUserQuery } from "@/lib/auth/use-current-user";
import { getCurrentUser } from "@/lib/auth/auth.functions";

const search = z.object({
  redirect: z.string().optional(),
  signedOut: z.boolean().optional(),
  created: z.boolean().optional(),
});

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser();
    if (user) throw redirect({ href: safeRedirect(search.redirect) });
  },
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — HouseProvider.in" },
      {
        name: "description",
        content:
          "Sign in to HouseProvider.in to pick up your saved homes, comparisons and visit plans.",
      },
      { property: "og:title", content: "Sign in — HouseProvider.in" },
      {
        property: "og:description",
        content: "Sign in to pick up your saved homes, comparisons and visit plans.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, signedOut } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // On success the auth client navigates the browser to Google, so busy stays set for the trip.
  async function google() {
    setError(null);
    setGoogleBusy(true);
    try {
      const { error: err } = await authClient.signIn.social({
        provider: "google",
        callbackURL: safeRedirect(redirect),
      });
      if (err) {
        setError(authErrorMessage(err));
        setGoogleBusy(false);
      }
    } catch {
      setError(authErrorMessage(null));
      setGoogleBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
      setPassword("");
      if (err) {
        setError(authErrorMessage(err));
        return;
      }
      setOk(true);
      await qc.invalidateQueries({ queryKey: currentUserQuery.queryKey });
      await navigate({ to: safeRedirect(redirect), replace: true });
    } catch {
      setError(authErrorMessage(null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      kicker="WELCOME BACK"
      title={
        <>
          Sign in to <em>your homes.</em>
        </>
      }
      lede="Your saved homes, comparisons and visit plans are waiting."
    >
      {signedOut && !error && <AuthNotice tone="success">You've signed out.</AuthNotice>}
      {ok && <AuthNotice tone="success">Signed in. Taking you there…</AuthNotice>}
      {error && <AuthNotice tone="error">{error}</AuthNotice>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="auth-row">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <ProviderRow onGoogle={google} googleBusy={googleBusy} />
      <p className="auth-switch">
        New to HouseProvider?{" "}
        <Link to="/signup" search={{ redirect }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
