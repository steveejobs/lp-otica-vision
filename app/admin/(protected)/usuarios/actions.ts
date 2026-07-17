"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  emailValue,
  enumValue,
  mutationErrorCode,
  optionalTextValue,
  uuidValue,
} from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const roles = ["admin", "editor", "attendant"] as const;

async function setUserActiveState(formData: FormData, active: boolean) {
  const session = await requireAdminRole(["admin"]);
  const id = uuidValue(formData, "id");
  let errorCode: string | null = null;

  try {
    if (id === session.profile.id) {
      throw new AdminValidationError("constraint");
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .single();

    if (error || !existing) {
      throw error ?? new AdminValidationError("invalid");
    }

    const { error: updateError } = await supabase.from("profiles").update({ active }).eq("id", id);
    if (updateError) throw updateError;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }

  if (errorCode) redirect(appendFeedback("/admin/usuarios", "error", errorCode));
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  redirect(appendFeedback("/admin/usuarios", "status", active ? "approved" : "blocked"));
}

export async function inviteUserAction(formData: FormData) {
  await requireAdminRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  let invitedId: string | null = null;
  let errorCode: string | null = null;
  try {
    const email = emailValue(formData);
    const name = optionalTextValue(formData, "name", { max: 120 });
    const role = enumValue(formData, "role", roles);
    const active = booleanValue(formData, "active");
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    if (listed.users.some((user) => user.email?.toLowerCase() === email)) throw new AdminValidationError("duplicate");
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: name ? { name } : undefined });
    if (error || !data.user) throw error ?? new Error("Invite failed");
    invitedId = data.user.id;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update({ active, name, role })
      .eq("id", invitedId)
      .select("id")
      .single();
    if (profileError || !profile) throw profileError ?? new Error("Profile setup failed");
  } catch (error) {
    if (invitedId) {
      try { await admin.auth.admin.deleteUser(invitedId); } catch { /* Avoid an authorized profile after partial failure. */ }
    }
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback("/admin/usuarios", "error", errorCode));
  revalidatePath("/admin/usuarios");
  redirect(appendFeedback("/admin/usuarios", "status", "invited"));
}

export async function approveUserAction(formData: FormData) {
  await setUserActiveState(formData, true);
}

export async function blockUserAction(formData: FormData) {
  await setUserActiveState(formData, false);
}

export async function updateUserAction(formData: FormData) {
  const session = await requireAdminRole(["admin"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/usuarios/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data: existing, error } = await supabase.from("profiles").select("id, role, active").eq("id", id).single();
    if (error) throw error;
    const role = enumValue(formData, "role", roles);
    const active = booleanValue(formData, "active");
    const name = optionalTextValue(formData, "name", { max: 120 });
    if (id === session.profile.id && role !== existing.role) throw new AdminValidationError("role");
    if (id === session.profile.id && !active) {
      if (formData.get("confirmation") !== "DESATIVAR MEU ACESSO") throw new AdminValidationError("constraint");
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("active", true)
        .neq("id", id);
      if (countError) throw countError;
      if ((count ?? 0) < 1) throw new AdminValidationError("constraint");
    }
    const { error: updateError } = await supabase.from("profiles").update({ active, name, role }).eq("id", id);
    if (updateError) throw updateError;
  } catch (error) { errorCode = mutationErrorCode(error); }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/usuarios"); revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}
