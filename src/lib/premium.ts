export function isPremiumActive(
  active: boolean | null | undefined,
  expiresAt: string | Date | null | undefined,
): boolean {
  // If the database flag says the plan is active, treat it as active.
  if (active) {
    return true;
  }

  // Otherwise, fall back to the expiry timestamp if provided.
  if (!expiresAt) {
    return false;
  }

  const timestamp =
    typeof expiresAt === "string"
      ? Date.parse(expiresAt)
      : expiresAt instanceof Date
        ? expiresAt.getTime()
        : NaN;

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  // Active if the expiry time is still in the future.
  return timestamp > Date.now();
}
