import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function listAuthorizedAuthUsers() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Não foi possível consultar as identidades autorizadas.");
  return data.users;
}

