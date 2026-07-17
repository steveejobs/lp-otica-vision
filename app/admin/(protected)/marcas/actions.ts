"use server";

import { randomUUID } from "node:crypto";

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
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { removeManagedImage, uploadManagedImage } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function imageFile(formData: FormData) {
  const value = formData.get("logo");
  return value instanceof File && value.size > 0 ? value : null;
}

function brandPayload(formData: FormData) {
  return {
    active: booleanValue(formData, "active"),
    display_order: integerValue(formData, "display_order", { max: 100_000 }),
    name: textValue(formData, "name", { max: 120 }),
    slug: slugValue(formData),
  };
}

export async function createBrandAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const id = randomUUID();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;

  try {
    const payload = brandPayload(formData);
    const file = imageFile(formData);
    if (payload.active && !file) throw new AdminValidationError("image");
    if (file) uploadedPath = (await uploadManagedImage({ bucket: "brand-logos", file, parentId: id })).path;
    const { error } = await supabase.from("brands").insert({
      ...payload,
      id,
      logo_url: uploadedPath,
    });
    if (error) throw error;
  } catch (error) {
    if (uploadedPath) {
      try {
        await removeManagedImage("brand-logos", uploadedPath);
      } catch {
        // The original error remains sanitized. A later storage QA detects cleanup failures.
      }
    }
    errorCode = mutationErrorCode(error);
  }

  if (errorCode) redirect(appendFeedback("/admin/marcas", "error", errorCode));
  revalidatePath("/admin/marcas");
  redirect(appendFeedback(`/admin/marcas/${id}`, "status", "created"));
}

export async function updateBrandAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/marcas/${id}`;
  const supabase = await createSupabaseServerClient();
  let uploadedPath: string | null = null;
  let errorCode: string | null = null;

  try {
    const { data: existing, error: readError } = await supabase
      .from("brands")
      .select("name, slug, active, display_order, logo_url")
      .eq("id", id)
      .single();
    if (readError) throw readError;
    const payload = brandPayload(formData);
    const file = imageFile(formData);
    if (payload.active && !file && !existing.logo_url) throw new AdminValidationError("image");
    if (file) uploadedPath = (await uploadManagedImage({ bucket: "brand-logos", file, parentId: id })).path;
    const { error: updateError } = await supabase
      .from("brands")
      .update({ ...payload, logo_url: uploadedPath ?? existing.logo_url })
      .eq("id", id);
    if (updateError) throw updateError;

    if (uploadedPath && existing.logo_url) {
      try {
        await removeManagedImage("brand-logos", existing.logo_url);
      } catch (storageError) {
        const { error: rollbackError } = await supabase.from("brands").update(existing).eq("id", id);
        try {
          await removeManagedImage("brand-logos", uploadedPath);
        } catch {
          // Keep the operation failed; QA reports any uncompensated storage error.
        }
        if (rollbackError) throw rollbackError;
        throw storageError;
      }
    }
  } catch (error) {
    if (uploadedPath) {
      const { data } = await supabase.from("brands").select("logo_url").eq("id", id).maybeSingle();
      if (data?.logo_url !== uploadedPath) {
        try {
          await removeManagedImage("brand-logos", uploadedPath);
        } catch {
          // Cleanup is best-effort after a failed database mutation.
        }
      }
    }
    errorCode = mutationErrorCode(error);
  }

  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/marcas");
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "saved"));
}

export async function toggleBrandAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data, error } = await supabase.from("brands").select("active, logo_url").eq("id", id).single();
    if (error) throw error;
    if (!data.active && !data.logo_url) throw new AdminValidationError("image");
    const { error: updateError } = await supabase.from("brands").update({ active: !data.active }).eq("id", id);
    if (updateError) throw updateError;
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback("/admin/marcas", "error", errorCode));
  revalidatePath("/admin/marcas");
  revalidatePublicCatalog();
  redirect(appendFeedback("/admin/marcas", "status", "saved"));
}

export async function removeBrandLogoAction(formData: FormData) {
  await requireAdminRole(["admin", "editor"]);
  const id = uuidValue(formData, "id");
  const destination = `/admin/marcas/${id}`;
  const supabase = await createSupabaseServerClient();
  let errorCode: string | null = null;
  try {
    const { data, error } = await supabase.from("brands").select("logo_url, active").eq("id", id).single();
    if (error) throw error;
    if (!data.logo_url) throw new AdminValidationError("invalid");
    const { error: updateError } = await supabase.from("brands").update({ active: false, logo_url: null }).eq("id", id);
    if (updateError) throw updateError;
    try {
      await removeManagedImage("brand-logos", data.logo_url);
    } catch (storageError) {
      const { error: rollbackError } = await supabase
        .from("brands")
        .update({ active: data.active, logo_url: data.logo_url })
        .eq("id", id);
      if (rollbackError) throw rollbackError;
      throw storageError;
    }
  } catch (error) {
    errorCode = mutationErrorCode(error);
  }
  if (errorCode) redirect(appendFeedback(destination, "error", errorCode));
  revalidatePath("/admin/marcas");
  revalidatePath(destination);
  revalidatePublicCatalog();
  redirect(appendFeedback(destination, "status", "removed"));
}
