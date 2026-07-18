import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton, ConfirmSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { FilePreviewInput } from "@/components/admin/file-preview-input";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createAdminImageUrl } from "@/lib/storage/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { removeBrandLogoAction, updateBrandAction } from "../actions";

export default async function EditBrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  await requireAdminRole(["admin", "editor"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: brand, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, active, display_order")
    .eq("id", id)
    .maybeSingle();
  if (error || !brand) notFound();
  const query = await searchParams;
  const logoUrl = await createAdminImageUrl("brand-logos", brand.logo_url);

  return (
    <>
      <AdminPageHeader
        eyebrow="Marcas"
        description="Edite identificação, ordem e status. A substituição do logo usa compensação entre banco e Storage."
        title={brand.name}
      />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}>
        <Link className={styles.buttonLink} href="/admin/marcas" prefetch={false}>Voltar para marcas</Link>
        <AdminStatus active={brand.active} />
      </div>

      <section className={styles.formPanel} aria-labelledby="brand-form-title">
        <div className={styles.panelHeading}>
          <h2 id="brand-form-title">Dados da marca</h2>
          <p>O slug deve permanecer único.</p>
        </div>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived private Storage URL.
          <img alt={`Logo de ${brand.name}`} className={styles.imagePreview} src={logoUrl} />
        ) : null}
        <form action={updateBrandAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={brand.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nome</span>
              <input defaultValue={brand.name} maxLength={120} name="name" required />
            </label>
            <label className={styles.field}>
              <span>Slug</span>
              <input defaultValue={brand.slug} maxLength={120} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            </label>
            <label className={styles.field}>
              <span>Ordem</span>
              <input defaultValue={brand.display_order} min="0" name="display_order" required type="number" />
            </label>
            <label className={styles.checkboxField}>
              <input defaultChecked={brand.active} name="active" type="checkbox" />
              <span>Ativa</span>
            </label>
            <div className={styles.fieldWide}>
              <FilePreviewInput id="brand-logo" name="logo" />
              <p className={styles.fieldHint}>Escolha um arquivo apenas para substituir o logo atual.</p>
            </div>
          </div>
          <div className={styles.formActions}>
            <AdminSubmitButton>Salvar marca</AdminSubmitButton>
          </div>
        </form>
      </section>

      {brand.logo_url ? (
        <section className={styles.dangerZone} aria-labelledby="remove-logo-title">
          <div className={styles.panelHeading}>
            <div>
              <h2 id="remove-logo-title">Remover logo</h2>
              <p>A marca será desativada automaticamente.</p>
            </div>
          </div>
          <form action={removeBrandLogoAction}>
            <input name="id" type="hidden" value={brand.id} />
            <ConfirmSubmitButton confirmation="Remover o logo e desativar esta marca?">Remover logo</ConfirmSubmitButton>
          </form>
        </section>
      ) : null}
    </>
  );
}
