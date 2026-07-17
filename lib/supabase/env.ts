type SupabasePublicEnv = {
  publishableKey: string;
  url: string;
};

function requirePublicValue(value: string | undefined, name: string) {
  if (!value?.trim()) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}.`);
  }

  return value.trim();
}

function validateUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL possui formato invalido.");
  }

  const isLocal = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";

  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL deve usar HTTPS fora do ambiente local.");
  }

  return parsed.origin;
}

function validatePublishableKey(value: string) {
  if (value.startsWith("sb_publishable_")) {
    return value;
  }

  // Supabase projects created before publishable keys may still use the legacy
  // public anon JWT in deployment environments. It is browser-safe, unlike
  // `sb_secret_`, and keeps older Vercel envs from crashing the admin proxy.
  if (value.startsWith("eyJ") && value.split(".").length === 3) {
    return value;
  }

  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY deve conter uma chave publicavel do Supabase.",
  );
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = requirePublicValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const publishableKey = requirePublicValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  return {
    publishableKey: validatePublishableKey(publishableKey),
    url: validateUrl(url),
  };
}
