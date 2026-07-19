"use server";

import { redirect } from "next/navigation";

import { AdminValidationError, appendFeedback, booleanValue, integerValue, mutationErrorCode, optionalTextValue, slugValue } from "@/lib/admin/validation";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { revalidatePublicCatalog } from "@/lib/catalog/revalidate";
import { HOME_CURATION_SETTING_KEY } from "@/lib/curation/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateHomeCurationAction(formData: FormData) {
  await requireAdminRole(["admin"]);

  const enabled = booleanValue(formData, "enabled");
  const published = booleanValue(formData, "published");
  const initialStyle = slugValue(formData, "initial_style");
  const categorySlug = optionalTextValue(formData, "category_slug", { max: 120 });
  if (categorySlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) throw new AdminValidationError("invalid");
  const displayOrder = integerValue(formData, "display_order", { max: 100_000 });
  const revision = integerValue(formData, "revision", { max: 100_000, min: 1 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        key: HOME_CURATION_SETTING_KEY,
        value: { categorySlug, displayOrder, enabled, initialStyle, published, revision },
      },
      { onConflict: "key" },
    );

  if (error) {
    redirect(appendFeedback("/admin/configuracoes", "error", mutationErrorCode(error)));
  }

  revalidatePublicCatalog();
  redirect(appendFeedback("/admin/configuracoes", "status", "saved"));
}
