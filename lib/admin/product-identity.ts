const MAX_SLUG_LENGTH = 120;

export function productSlugFromName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

export function nextAvailableProductSlug(name: string, existingSlugs: Iterable<string>) {
  const base = productSlugFromName(name);
  if (!base) return null;

  const existing = new Set(existingSlugs);
  if (!existing.has(base)) return base;

  for (let suffixNumber = 2; suffixNumber < 1_000_000; suffixNumber += 1) {
    const suffix = `-${suffixNumber}`;
    const trimmedBase = base
      .slice(0, MAX_SLUG_LENGTH - suffix.length)
      .replace(/-+$/g, "");
    const candidate = `${trimmedBase}${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }

  return null;
}
