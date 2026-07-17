"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/supabase";

import { getSupabasePublicEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabasePublicEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
