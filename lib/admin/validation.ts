const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isUuidString(value: string | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export class AdminValidationError extends Error {
  readonly code: string;

  constructor(code = "invalid") {
    super(code);
    this.name = "AdminValidationError";
    this.code = code;
  }
}

export function textValue(
  formData: FormData,
  key: string,
  options: { max: number; min?: number } = { max: 255 },
) {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    throw new AdminValidationError("invalid");
  }

  const value = raw.trim();
  if (!value) {
    throw new AdminValidationError("required");
  }

  if (value.length > options.max || value.length < (options.min ?? 1)) {
    throw new AdminValidationError("length");
  }

  return value;
}

export function optionalTextValue(
  formData: FormData,
  key: string,
  options: { max: number; min?: number } = { max: 255 },
) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string") throw new AdminValidationError("invalid");
  const value = raw.trim();
  if (!value) return null;
  if (value.length > options.max || value.length < (options.min ?? 1)) {
    throw new AdminValidationError("length");
  }
  return value;
}

export function slugValue(formData: FormData, key = "slug") {
  const value = textValue(formData, key, { max: 120 });
  if (!SLUG_PATTERN.test(value)) throw new AdminValidationError("slug");
  return value;
}

export function routeKeyValue(formData: FormData, key = "route_key") {
  const value = textValue(formData, key, { max: 120 });
  if (!ROUTE_KEY_PATTERN.test(value)) throw new AdminValidationError("route");
  return value;
}

export function uuidValue(formData: FormData, key: string): string;
export function uuidValue(formData: FormData, key: string, optional: true): string | null;
export function uuidValue(formData: FormData, key: string, optional = false): string | null {
  const raw = formData.get(key);
  if ((raw === null || raw === "") && optional) return null;
  if (typeof raw !== "string" || !UUID_PATTERN.test(raw)) {
    throw new AdminValidationError("invalid");
  }
  return raw;
}

export function uuidListValue(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  if (values.some((value) => !UUID_PATTERN.test(value)) || new Set(values).size !== values.length) {
    throw new AdminValidationError("invalid");
  }
  return values;
}

export function orderedUuidList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length > 20_000) {
    throw new AdminValidationError("invalid_order");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AdminValidationError("invalid_order");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== "string" || !UUID_PATTERN.test(entry)) ||
    new Set(parsed).size !== parsed.length
  ) {
    throw new AdminValidationError("invalid_order");
  }
  return parsed as string[];
}

export function booleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function integerValue(
  formData: FormData,
  key: string,
  options: { max?: number; min?: number } = {},
) {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new AdminValidationError("number");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < (options.min ?? 0) || value > (options.max ?? 1_000_000)) {
    throw new AdminValidationError("number");
  }
  return value;
}

export function optionalIntegerValue(
  formData: FormData,
  key: string,
  options: { max?: number; min?: number } = {},
) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  return integerValue(formData, key, options);
}

export function optionalMoneyValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || !/^\d{1,10}(?:[.,]\d{1,2})?$/.test(raw.trim())) {
    throw new AdminValidationError("price");
  }
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) throw new AdminValidationError("price");
  return value;
}

export function optionalPositiveMoneyCentsValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || !/^\d{1,12}$/.test(raw)) {
    throw new AdminValidationError("price");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new AdminValidationError("price");
  return value;
}

export function enumValue<const T extends readonly string[]>(
  formData: FormData,
  key: string,
  values: T,
) {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !(values as readonly string[]).includes(raw)) {
    throw new AdminValidationError("invalid");
  }
  return raw as T[number];
}

export function emailValue(formData: FormData, key = "email") {
  const value = textValue(formData, key, { max: 254 }).toLowerCase();
  if (!EMAIL_PATTERN.test(value)) throw new AdminValidationError("email");
  return value;
}

export function dateTimeValue(formData: FormData, key: string): string;
export function dateTimeValue(formData: FormData, key: string, optional: true): string | null;
export function dateTimeValue(formData: FormData, key: string, optional = false): string | null {
  const raw = formData.get(key);
  if ((raw === null || raw === "") && optional) return null;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    throw new AdminValidationError("date");
  }
  const parsed = new Date(`${raw}:00-03:00`);
  if (Number.isNaN(parsed.getTime())) throw new AdminValidationError("date");
  return parsed.toISOString();
}

export function objectPositionValue(formData: FormData, key: string) {
  const value = textValue(formData, key, { max: 40 });
  const parts = value.split(/\s+/);
  if (parts.length !== 2) throw new AdminValidationError("position");
  const horizontal = parsePositionPart(parts[0], ["left", "center", "right"]);
  const vertical = parsePositionPart(parts[1], ["top", "center", "bottom"]);
  if (!horizontal || !vertical) throw new AdminValidationError("position");
  return `${parts[0]} ${parts[1]}`;
}

function parsePositionPart(value: string, keywords: string[]) {
  if (keywords.includes(value)) return true;
  const match = /^(\d{1,3})%$/.exec(value);
  return Boolean(match && Number(match[1]) <= 100);
}

export function ensureDateWindow(start: string | null, end: string | null) {
  if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
    throw new AdminValidationError("date_window");
  }
}

export function sanitizedSearch(value: string | undefined, max = 80) {
  return (value ?? "")
    .slice(0, max)
    .replace(/[%_,().'"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mutationErrorCode(error: unknown) {
  if (error instanceof AdminValidationError) return error.code;
  if (!error || typeof error !== "object") return "failed";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "23505") return "duplicate";
  if (code === "23503") return "linked";
  if (code === "23514" || code === "22023") return "constraint";
  if (code === "42501" || code === "PGRST301") return "forbidden";
  return "failed";
}

export function appendFeedback(path: string, kind: "error" | "status", code: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${encodeURIComponent(code)}`;
}
