/**
 * Rate-limit policy for auth endpoints. Enforced by the auth library with counters
 * stored in the database (RateLimit table), so limits hold across server instances.
 * Password-reset and OTP rules are declared now and take effect once those
 * endpoints are enabled (email/SMS providers are not connected yet).
 */
export const AUTH_RATE_LIMITS = {
  "/sign-in/email": { window: 60, max: 5 },
  "/sign-up/email": { window: 60 * 60, max: 5 },
  "/request-password-reset": { window: 60 * 15, max: 3 },
  "/phone-number/send-otp": { window: 60 * 15, max: 3 },
} as const;
