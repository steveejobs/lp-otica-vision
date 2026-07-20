export const ANALYTICS_CONSENT_VERSION = 1;
export const ANALYTICS_CONSENT_KEY = "vision.analytics.consent";
export const ANALYTICS_CONSENT_COOKIE = "vision_analytics_consent";
export const ANALYTICS_CONSENT_CHANGE_EVENT = "vision:analytics-consent-change";
export const ANALYTICS_PREFERENCES_OPEN_EVENT = "vision:analytics-preferences-open";

export type AnalyticsConsentChoice = "accepted" | "rejected" | "unknown";

type StoredConsent = {
  choice: Exclude<AnalyticsConsentChoice, "unknown">;
  version: number;
};

function parseConsent(value: string | null): AnalyticsConsentChoice {
  if (!value) return "unknown";
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<StoredConsent>;
    if (parsed.version !== ANALYTICS_CONSENT_VERSION) return "unknown";
    return parsed.choice === "accepted" || parsed.choice === "rejected" ? parsed.choice : "unknown";
  } catch {
    return "unknown";
  }
}

export function readAnalyticsConsent(): AnalyticsConsentChoice {
  if (typeof window === "undefined") return "unknown";
  try {
    const local = parseConsent(window.localStorage.getItem(ANALYTICS_CONSENT_KEY));
    if (local !== "unknown") return local;
  } catch {
    // The technical cookie fallback keeps the choice usable when storage is blocked.
  }
  const cookie = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`));
  return parseConsent(cookie?.slice(ANALYTICS_CONSENT_COOKIE.length + 1) ?? null);
}

export function writeAnalyticsConsent(choice: Exclude<AnalyticsConsentChoice, "unknown">) {
  const serialized = JSON.stringify({ choice, version: ANALYTICS_CONSENT_VERSION } satisfies StoredConsent);
  try { window.localStorage.setItem(ANALYTICS_CONSENT_KEY, serialized); } catch {}
  try {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${encodeURIComponent(serialized)}; Path=/; Max-Age=15552000; SameSite=Lax; Secure`;
  } catch {}
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGE_EVENT, { detail: { choice } }));
}
