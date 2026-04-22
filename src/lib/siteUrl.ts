const FALLBACK_SITE_URL = "https://bountask.com";

export function getSiteUrl(): URL {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL;

  try {
    const parsed = new URL(candidate);
    return new URL(parsed.origin);
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export function getSiteOrigin(): string {
  return getSiteUrl().origin;
}

export function getAbsoluteSiteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}