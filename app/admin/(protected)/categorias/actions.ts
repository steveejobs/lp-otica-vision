"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  AdminValidationError,
  appendFeedback,
  booleanValue,
  integerValue,
  mutationErrorCode,
  slugValue,
  textValue,
  uuidValue,
} from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function categoryPayload(formData: FormData) {
  return {
    active: booleanValue(formData, "active"),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    name: textValue(formData, "name", { max: 120 }),
    slug: slugValue(formData),
  };
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  let id: string | null = null;
  let errorCode: string | null = null;
  try {
    const { data, error } = await supabase.from("categories").insert(categoryPayload(formData)).select("id").single();
    if (error) throw error;
    id = data.id;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode || !id) redirect(appendFeedback("/admin/categorias", "error", errorCode ?? "failed"));
  revalidatePath("/admin/categorias");
  redirect(appendFeedback(`/admin/categorias/${id}`, "status", "created"));
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/categorias/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { error } = await supabase.from("categories").update(categoryPayload(formData)).eq("id", id);
    if (error) throw error;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/categorias");
  revalidatePath(destination);
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function toggleCategoryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data, error } = await supabase.from("categories").select("active").eq("id", id).single();
    if (error) throw error;
    const { error: updateError } = await supabase.from("categories").update({ active: !data.active }).eq("id", id);
    if (updateError) throw updateError;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback("/admin/categorias", "error", errorCode));
  revalidatePath("/admin/categorias");
  redirect(appendFeedback("/admin/categorias", "status", "saved"));
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/categorias/${id}`;
  const supabase = await createSupabaseServerClient();
  let resultStatus = "deleted";
  let errorCode: string | null = null;
  try {
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      const strategy = formData.get("strategy");
      const confirmation = formData.get("confirmation");
      if (strategy !== "deactivate" || confirmation !== "DESATIVAR") {
        throw new AdminValidationError("linked");
      }
      const { error } = await supabase.from("categories").update({ active: false }).eq("id", id);
      if (error) throw error;
      resultStatus = "saved";
    } else {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    }
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/categorias");
  redirect(appendFeedback("/admin/categorias", "status", resultStatus));
}

