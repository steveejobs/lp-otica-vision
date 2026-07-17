import "server-only";

const SENSITIVE_KEY = /(password|secret|token|authorization|api[_-]?key|cookie|session|credential)/i;

export function maskAuditPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskAuditPayload);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[oculto]" : maskAuditPayload(entry),
    ]),
  );
}

export function auditJson(value: unknown) {
  if (value === null || value === undefined) return "—";
  return JSON.stringify(maskAuditPayload(value), null, 2);
}

