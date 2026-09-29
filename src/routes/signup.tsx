import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthField, AuthNotice, AuthShell, ProviderRow } from "@/components/auth-shell";
import { authClient, authErrorMessage } from "@/lib/auth/auth-client";
import { currentUserQuery } from "@/lib/auth/use-current-user";
import { safeRedirect } from "./login";

export const Route = createFileRoute("/signup")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Create an account — HouseProvider.in" },
    { name: "description", content: "Create a free HouseProvider.in account to save homes, compare them side by side and plan visits." },
    { property: "og:title", content: "Create an account — HouseProvider.in" },
    { property: "og:description", content: "Save homes, compare them side by side and plan visits." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SignupPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.").or(z.literal("")),
  password: z.string().min(10, "Use at least 10 characters.").max(128).regex(/[A-Za-z]/, "Include at least one letter.").regex(/\d/, "Include at least one number."),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match." });

type Form = z.input<typeof schema>;
const empty: Form = { name: "", email: "", phone: "", password: "", confirm: "" };

function SignupPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate(); const qc = useQueryClient();
  const [f, setF] = useState<Form>(empty);
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [ok, setOk] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    const parsed = schema.safeParse(f);
    if (!parsed.success) { setErrs(Object.fromEntries(parsed.error.issues.map(i => [i.path[0], i.message]))); return; }
    setErrs({}); setBusy(true);
    try {
      const d = parsed.data;
      const { error: err } = await authClient.signUp.email({ name: d.name, email: d.email, password: d.password, ...(d.phone ? { phone: d.phone.replace(/[\s-]/g, "") } : {}) } as Parameters<typeof authClient.signUp.email>[0]);
      setF(s => ({ ...s, password: "", confirm: "" }));
      if (err) { setError(authErrorMessage(err)); return; }
      setOk(true);
      await qc.invalidateQueries({ queryKey: currentUserQuery.queryKey });
      await navigate({ to: safeRedirect(redirect), replace: true });
    } catch { setError(authErrorMessage(null)); } finally { setBusy(false); }
  }

  return <AuthShell kicker="CREATE ACCOUNT" title={<>Start your <em>next move.</em></>} lede="Save homes, compare them side by side and plan visits — all in one place."
    aside={<span>Everyone starts as a home seeker. Owner and agent tools are enabled by our team after review.</span>}>
    {ok && <AuthNotice tone="success">Account created. Welcome to HouseProvider.</AuthNotice>}
    {error && <AuthNotice tone="error">{error}</AuthNotice>}
    <form className="auth-form" onSubmit={submit} noValidate>
      <AuthField label="Full name" name="name" autoComplete="name" value={f.name} onChange={set("name")} error={errs.name}/>
      <AuthField label="Email" name="email" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={errs.email}/>
      <AuthField label="Phone (optional)" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set("phone")} error={errs.phone}/>
      <AuthField label="Password" name="password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} error={errs.password} hint="At least 10 characters, with a letter and a number."/>
      <AuthField label="Confirm password" name="confirm" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} error={errs.confirm}/>
      <Button type="submit" className="auth-submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
      <p className="auth-fine">Email verification isn't switched on yet, so we won't send you an email right now.</p>
    </form>
    <ProviderRow/>
    <p className="auth-switch">Already have an account? <Link to="/login" search={{ redirect }}>Sign in</Link></p>
  </AuthShell>;
}
