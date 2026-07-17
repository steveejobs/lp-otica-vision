"use server";

import { redirect } from "next/navigation";

import { appendFeedback, booleanValue, mutationErrorCode } from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import {
  HOME_CATALOG_PREVIEW_SETTING_KEY,
} from "@/lib/catalog/home-preview-settings";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateHomeCatalogPreviewAction(formData: FormData) {
  await requireAdminRole(["admin"]);

  const enabled = booleanValue(formData, "enabled");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        key: HOME_CATALOG_PREVIEW_SETTING_KEY,
        value: { enabled },
      },
      { onConflict: "key" },
    );

  if (error) {
    redirect(appendFeedback("/admin/configuracoes", "error", mutationErrorCode(error)));
  }

  revalidatePublicCatalog();
  redirect(appendFeedback("/admin/configuracoes", "status", "saved"));
}
