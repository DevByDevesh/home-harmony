import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/** Editorial two-column frame for sign-in pages: plum statement panel + quiet form. */
export function AuthShell({ kicker, title, lede, children, aside }: { kicker: string; title: ReactNode; lede: string; children: ReactNode; aside?: ReactNode }) {
  return <main className="auth-page">
    <section className="auth-statement" aria-hidden="true">
      <p className="kicker">HOUSEPROVIDER.IN</p>
      <p className="auth-quote">Good places.<br/><em>New beginnings.</em></p>
      <div className="auth-statement-foot">{aside ?? <span>One account for searching, saving, comparing and planning visits.</span>}</div>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="auth-lede">{lede}</p>
        {children}
      </div>
    </section>
  </main>;
}

export function AuthNotice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return <div className={`auth-notice auth-notice-${tone}`} role={tone === "error" ? "alert" : "status"}><Icon size={16}/><span>{children}</span></div>;
}

export function AuthField({ label, hint, error, ...input }: { label: string; hint?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const isPw = input.type === "password";
  const id = input.id ?? input.name;
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap">
      <input {...input} id={id} type={isPw && show ? "text" : input.type} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}/>
      {isPw && <button type="button" className="auth-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16}/> : <Eye size={16}/>}</button>}
    </div>
    {error ? <small id={`${id}-err`} className="auth-field-error">{error}</small> : hint ? <small id={`${id}-hint`}>{hint}</small> : null}
  </div>;
}

export function ProviderRow() {
  return <div className="auth-providers" aria-label="Other sign-in options">
    <div className="auth-divider"><span>Other options</span></div>
    <button type="button" disabled aria-disabled="true">Continue with Google <small>Not configured yet</small></button>
    <button type="button" disabled aria-disabled="true">Phone number (OTP) <small>Not configured yet</small></button>
  </div>;
}
