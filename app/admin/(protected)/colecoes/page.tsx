import { AdminFeedback, AdminPageHeader } from "@/components/admin/admin-ui";
import { CollectionCreateForm } from "@/components/admin/collection-create-form";
import { CollectionPresetGrid } from "@/components/admin/collection-preset-grid";
import { CollectionRecordsTable } from "@/components/admin/collection-records-table";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminCollectionsPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, slug, published, featured, home_enabled, home_placement_key, home_variant, starts_at, ends_at, display_order, updated_at")
    .order("display_order")
    .order("name")
    .limit(100);
  if (error || !collections) throw new Error("Não foi possível carregar as coleções administrativas.");
  const query = await searchParams;
  return (
    <>
      <AdminPageHeader description="Curadorias com modelos prontos, capa privada, produtos ordenados e janela opcional. Datas não geram urgência automática." title="Coleções" />
      <AdminFeedback error={query.error} status={query.status} />
      <CollectionPresetGrid collections={collections} />
      <CollectionCreateForm />
      <CollectionRecordsTable collections={collections} />
    </>
  );
}
