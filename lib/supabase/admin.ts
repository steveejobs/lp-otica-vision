import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

function getSecretKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("Variavel de ambiente obrigatoria ausente: SUPABASE_SECRET_KEY.");
  }

  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error("SUPABASE_SECRET_KEY deve conter uma chave secreta server-only.");
  }

  return secretKey;
}

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicEnv();

  return createClient<Database>(url, getSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
