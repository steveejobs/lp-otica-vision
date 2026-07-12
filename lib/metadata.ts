export function getMetadataBase() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const candidate = configured || (vercelProduction ? `https://${vercelProduction}` : "");

  if (!candidate) return undefined;

  try {
    return new URL(candidate);
  } catch {
    return undefined;
  }
}
