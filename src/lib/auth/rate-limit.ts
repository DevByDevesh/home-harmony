/**
 * Rate-limit policy for auth endpoints. Enforced by the auth library with counters
 * stored in the database (RateLimit table), so limits hold across server instances.
 * The password-reset rule takes effect once an email provider is connected.
 */
export const AUTH_RATE_LIMITS = {
  "/sign-in/email": { window: 60, max: 10 },
  "/sign-up/email": { window: 60 * 60, max: 5 },
  "/request-password-reset": { window: 60 * 15, max: 3 },
} as const;
