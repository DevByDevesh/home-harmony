import { createAuthClient } from "better-auth/react";
import { AUTH_ERRORS } from "./roles";

/** Browser auth client. Talks to /api/auth on the same origin; holds no secrets. */
export const authClient = createAuthClient({ fetchOptions: { credentials: "include" } });

/** Maps server errors to user-facing copy without revealing whether an email exists. */
export function authErrorMessage(err: { message?: string | undefined; code?: string | undefined; status?: number | undefined } | null | undefined): string {
  const code = err?.code ?? err?.message ?? "";
  if (code.includes(AUTH_ERRORS.SUSPENDED)) return "This account is suspended. Contact HouseProvider support if you think this is a mistake.";
  if (code.includes(AUTH_ERRORS.DEACTIVATED)) return "This account has been deactivated and can't be used to sign in.";
  if (code.includes(AUTH_ERRORS.PENDING)) return "This account isn't active yet.";
  if (err?.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "INVALID_EMAIL_OR_PASSWORD" || err?.status === 401) return "That email and password don't match. Check them and try again.";
  if (code.includes("USER_ALREADY_EXISTS")) return "An account with this email already exists. Try signing in instead.";
  if (code.includes("PASSWORD_TOO_SHORT")) return "Password must be at least 10 characters.";
  if (!err?.status) return "We couldn't reach the server. Check your connection and try again.";
  return "Something went wrong on our side. Please try again.";
}
