/**
 * Public application URL helpers for auth redirects and client-side return URLs.
 *
 * Priority:
 * 1. VITE_APP_URL when set (and not a localhost value in production builds)
 * 2. Current browser origin (window.location.origin)
 *
 * Never falls back to http://localhost:3000.
 * Vite local dev uses port 8080 (see vite.config.ts).
 */

const LOCALHOST_RE = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function normalizeAppOrigin(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function isLocalhostOrigin(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(normalizeAppOrigin(url));
    if (protocol !== "http:" && protocol !== "https:") return false;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return LOCALHOST_RE.test(url.trim());
  }
}

/**
 * Resolve the public app origin for building auth redirect URLs.
 * @throws if no usable origin can be determined (avoids inventing localhost:3000).
 */
export function getPublicAppOrigin(options?: {
  configuredUrl?: string | null;
  browserOrigin?: string | null;
  /** When true (Vite PROD), reject configured localhost values */
  isProduction?: boolean;
}): string {
  const isProduction =
    options?.isProduction ??
    (typeof import.meta !== "undefined" &&
      Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD));

  const configuredRaw =
    options && "configuredUrl" in options
      ? options.configuredUrl
      : typeof import.meta !== "undefined"
        ? ((import.meta as ImportMeta & { env?: { VITE_APP_URL?: string } }).env?.VITE_APP_URL ??
          null)
        : null;

  if (configuredRaw?.trim()) {
    const configured = normalizeAppOrigin(configuredRaw);
    if (!(isProduction && isLocalhostOrigin(configured))) {
      return configured;
    }
  }

  const browserRaw =
    options && "browserOrigin" in options
      ? options.browserOrigin
      : typeof window !== "undefined"
        ? window.location.origin
        : null;

  if (browserRaw?.trim()) {
    return normalizeAppOrigin(browserRaw);
  }

  throw new Error(
    "Public app URL is not configured. Set VITE_APP_URL or call from a browser context.",
  );
}

/** Join origin + path without double slashes. Path should start with /. */
export function getAuthRedirectUrl(
  path: string,
  options?: Parameters<typeof getPublicAppOrigin>[0],
): string {
  const origin = getPublicAppOrigin(options);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
}
