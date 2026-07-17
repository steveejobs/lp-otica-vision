import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteCategoryAction, updateCategoryAction } from "../actions";

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: category, error }, linkedResult] = await Promise.all([
    supabase.from("categories").select("id, name, slug, active, display_order").eq("id", id).maybeSingle(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id),
  ]);
  if (error || linkedResult.error || !category) notFound();
  const query = await searchParams;
  const linkedCount = linkedResult.count ?? 0;

  return (
    <>
      <AdminPageHeader eyebrow="Categorias" description="Edite a taxonomia sem romper os vínculos existentes." title={category.name} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <Link className={styles.buttonLink} href="/admin/categorias">Voltar para categorias</Link>
        <AdminStatus active={category.active} />
      </div>
      <section className={styles.formPanel} aria-labelledby="category-form-title">
        <div className={styles.panelHeading}>
          <h2 id="category-form-title">Dados da categoria</h2>
          <p>{linkedCount} produto(s) vinculado(s).</p>
        </div>
        <form action={updateCategoryAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={category.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input defaultValue={category.name} maxLength={120} name="name" required /></label>
            <label className={styles.field}><span>Slug</span><input defaultValue={category.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
            <label className={styles.field}><span>Ordem</span><input defaultValue={category.display_order} min="0" name="display_order" required type="number" /></label>
            <label className={styles.checkboxField}><input defaultChecked={category.active} name="active" type="checkbox" /><span>Ativa</span></label>
          </div>
          <div className={styles.formActions}><AdminSubmitButton>Salvar categoria</AdminSubmitButton></div>
        </form>
      </section>

      <section className={styles.dangerZone} aria-labelledby="category-delete-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="category-delete-title">{linkedCount ? "Desativação segura" : "Excluir categoria"}</h2>
            <p>{linkedCount ? "Categorias vinculadas não são excluídas. Confirme a estratégia para apenas desativá-la." : "A categoria não possui produtos vinculados."}</p>
          </div>
        </div>
        <form action={deleteCategoryAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={category.id} />
          {linkedCount ? (
            <>
              <input name="strategy" type="hidden" value="deactivate" />
              <label className={styles.field}>
                <span>Digite DESATIVAR para confirmar</span>
                <input autoComplete="off" name="confirmation" pattern="DESATIVAR" required />
              </label>
              <ConfirmSubmitButton confirmation="Desativar esta categoria mantendo todos os vínculos?">Desativar categoria vinculada</ConfirmSubmitButton>
            </>
          ) : (
            <ConfirmSubmitButton confirmation="Excluir esta categoria sem vínculos?">Excluir categoria</ConfirmSubmitButton>
          )}
        </form>
      </section>
    </>
  );
}

