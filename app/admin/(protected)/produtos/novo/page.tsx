import Link from "next/link";

import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createProductAction } from "../actions";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminRole(["admin", "editor"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: brands, error: brandError }, { data: categories, error: categoryError }, styleResult] = await Promise.all([
    supabase.from("brands").select("id, name, active").order("name"),
    supabase.from("categories").select("id, name, active").order("name"),
    supabase.from("styles").select("id, label, description, active").order("display_order"),
  ]);
  if (brandError || categoryError || !brands || !categories) throw new Error("Não foi possível preparar o cadastro de produto.");
  const query = await searchParams;
  return (
    <>
      <AdminPageHeader eyebrow="Produtos" description="O produto nasce como rascunho e com disponibilidade sob consulta. Adicione uma capa validada antes de publicar." title="Novo produto" />
      <AdminFeedback error={query.error} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/produtos" prefetch={false}>Voltar para produtos</Link></div>
      <section className={styles.formPanel} aria-labelledby="new-product-form"><h2 className={styles.eyebrow} id="new-product-form">Dados do rascunho</h2><ProductForm action={createProductAction} brands={brands} categories={categories} styleEligibilityReasons={["produto ainda não publicado", "sem capa publicada", "sem estilo ativo"]} styleOptions={styleResult.error ? [] : styleResult.data ?? []} /></section>
    </>
  );
}
