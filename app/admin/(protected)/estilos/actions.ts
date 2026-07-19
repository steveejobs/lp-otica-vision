"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appendFeedback, booleanValue, integerValue, mutationErrorCode, orderedUuidList, slugValue, textValue, uuidValue } from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function payload(formData: FormData) {
  return {
    active: booleanValue(formData, "active"),
    description: textValue(formData, "description", { max: 240 }),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    label: textValue(formData, "label", { max: 80 }),
    slug: slugValue(formData),
  };
}

export async function createStyleAction(formData: FormData) {
  await requireAdminRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("styles").insert(payload(formData)).select("id").single();
  if (error || !data) redirect(appendFeedback("/admin/estilos", "error", mutationErrorCode(error)));
  revalidatePath("/admin/estilos");
  redirect(appendFeedback(`/admin/estilos/${data.id}`, "status", "created"));
}

export async function updateStyleAction(formData: FormData) {
  await requireAdminRole(["admin"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/estilos/${id}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("styles").update(payload(formData)).eq("id", id);
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath("/admin/estilos");
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function toggleStyleAction(formData: FormData) {
  await requireAdminRole(["admin"]);
  const id = uuidValue(formData, "id");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("styles").select("active").eq("id", id).single();
  if (error) redirect(appendFeedback("/admin/estilos", "error", mutationErrorCode(error)));
  const { error: updateError } = await supabase.from("styles").update({ active: !data.active }).eq("id", id);
  if (updateError) redirect(appendFeedback("/admin/estilos", "error", mutationErrorCode(updateError)));
  revalidatePath("/admin/estilos");
  revalidatePublicCatalog();
  redirect(appendFeedback("/admin/estilos", "status", "saved"));
}

export async function reorderStyleProductsAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const styleId = uuidValue(formData, "style_id");
  const orderedIds = orderedUuidList(formData.get("ordered_ids"));
  const destination = `/admin/estilos/${styleId}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reorder_style_products", { ordered_product_ids: orderedIds, target_style_id: styleId });
  if (error) redirect(appendFeedback(destination, "error", mutationErrorCode(error)));
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "reordered"));
}
