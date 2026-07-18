import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type AdminRole = Database["public"]["Enums"]["admin_role"];

export type AdminSession = {
  profile: {
    active: true;
    id: string;
    name: string | null;
    role: AdminRole;
  };
};

const getAdminSessionCached = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = !error && typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!subject) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, role, active")
    .eq("id", subject)
    .maybeSingle();

  if (profileError || !profile?.active) {
    return null;
  }

  return {
    profile: {
      active: true,
      id: profile.id,
      name: profile.name,
      role: profile.role,
    },
  };
});

export function getAdminSession() {
  return getAdminSessionCached();
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireAdminRole(allowedRoles: readonly AdminRole[]) {
  const session = await requireAdminSession();

  if (!allowedRoles.includes(session.profile.role)) {
    redirect("/admin?status=forbidden");
  }

  return session;
}
