import { timingSafeEqual } from "crypto";

/**
 * Constant-time comparison of two strings to avoid timing side-channel
 * attacks when validating HMAC-like shared secrets (e.g., cron secrets,
 * admin-page secrets). Returns false for any null/undefined/length-mismatch
 * inputs without short-circuiting on length equality only.
 */
export function safeCompareSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  // Pad to the same length so timingSafeEqual doesn't throw; compare lengths
  // as part of the final result to avoid leaking which branch ran.
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // Still run a dummy comparison to keep timing similar
    try {
      timingSafeEqual(a, a);
    } catch {
      // ignore
    }
    return false;
  }
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Validates a cron request header against the CRON_SECRET env var.
 * Fails closed: if CRON_SECRET is not configured, the request is
 * rejected. Callers should use this for all scheduled endpoints.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = request.headers.get("x-cron-secret");
  return safeCompareSecret(provided, expected);
}
