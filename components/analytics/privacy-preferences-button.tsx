"use client";

import { ANALYTICS_PREFERENCES_OPEN_EVENT } from "@/lib/analytics/consent";

export function PrivacyPreferencesButton({ className }: { className?: string }) {
  return <button className={className} onClick={() => window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_OPEN_EVENT))} type="button">Preferências de cookies</button>;
}
