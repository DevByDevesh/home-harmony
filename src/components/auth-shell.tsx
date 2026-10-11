import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
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

export function AuthField({ label, hint, error, ...input }: { label: string; hint?: string | undefined; error?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
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

export function ProviderRow({ onGoogle, googleBusy }: { onGoogle: () => void; googleBusy?: boolean }) {
  return <div className="auth-providers" aria-label="Other sign-in options">
    <div className="auth-divider"><span>Other options</span></div>
    <button type="button" onClick={onGoogle} disabled={googleBusy}>
      <span className="auth-provider-brand" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/>
          <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/>
          <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/>
          <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"/>
        </svg>
      </span>
      <span>{googleBusy ? "Continuing with Google…" : "Continue with Google"}</span>
      <ArrowRight size={16} aria-hidden="true" />
    </button>
  </div>;
}
