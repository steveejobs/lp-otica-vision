export const REALTIME_REFRESH_INTERVAL_MS = 45_000;

export function shouldRefreshRealtime(visibility: DocumentVisibilityState, online: boolean) {
  return visibility === "visible" && online;
}
