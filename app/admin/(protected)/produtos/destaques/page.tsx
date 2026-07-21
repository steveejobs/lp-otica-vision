import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { FeaturedDndList } from "@/components/admin/featured-dnd-list";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback } from "@/components/admin/admin-ui";

export default async function AdminFeaturedProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  await requireAdminRole(["admin", "editor"]);
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name, sku, brand:brands(name), cover:product_images!inner(alt_text, blur_data_url, object_position, storage_path, asset_version, is_cover)
    `)
    .eq("featured", true)
    .eq("cover.is_cover", true)
    .is("archived_at", null)
    .order("display_order", { ascending: true });

  if (error || !products) {
    throw new Error("Não foi possível carregar os produtos em destaque.");
  }

  const initialProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    brand: product.brand?.name ?? "Sem marca",
    cover: product.cover[0] ? {
      alt_text: product.cover[0].alt_text,
      object_position: product.cover[0].object_position,
      blur_data_url: product.cover[0].blur_data_url,
      storage_path: product.cover[0].storage_path,
      asset_version: product.cover[0].asset_version,
    } : null,
  }));

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link className={styles.textButton} href="/admin/produtos">
          <ArrowLeft size={16} /> Voltar para produtos
        </Link>
      </div>
      
      <AdminPageHeader
        description="Arraste os produtos para definir a ordem em que aparecem na Vitrine Vision (Destaques). Apenas produtos marcados como destaque aparecem aqui."
        title="Ordenar Destaques"
      />
      
      <AdminFeedback error={params.error} status={params.status} />

      {initialProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nenhum produto marcado como destaque.</p>
          <Link href="/admin/produtos" className={styles.buttonLink}>
            Buscar produtos
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          <FeaturedDndList initialProducts={initialProducts} />
        </div>
      )}
    </>
  );
}
