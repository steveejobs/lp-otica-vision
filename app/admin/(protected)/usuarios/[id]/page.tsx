import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminFeedback, AdminPageHeader, AdminStatus } from "@/components/admin/admin-ui";
import { listAuthorizedAuthUsers } from "@/lib/admin/auth-users";
import { formatAdminDateTime } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateUserAction } from "../actions";

export default async function EditUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; status?: string }> }) {
  const session = await requireAdminRole(["admin"]);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: profile, error }, authUsers] = await Promise.all([
    supabase.from("profiles").select("id, name, role, active, updated_at").eq("id", id).maybeSingle(),
    listAuthorizedAuthUsers(),
  ]);
  if (error || !profile) notFound();
  const authUser = authUsers.find((user) => user.id === profile.id);
  if (!authUser) notFound();
  const query = await searchParams;
  const isSelf = profile.id === session.profile.id;
  return (
    <>
      <AdminPageHeader eyebrow="Usuários" description="Papéis e ativação são validados no servidor e novamente por RLS/trigger." title={profile.name ?? "Usuário autorizado"} />
      <AdminFeedback error={query.error} status={query.status} />
      <div className={styles.adminToolbar}><Link className={styles.buttonLink} href="/admin/usuarios">Voltar para usuários</Link><AdminStatus active={profile.active} /></div>
      <section className={styles.formPanel} aria-labelledby="user-access-title">
        <div className={styles.panelHeading}><div><h2 id="user-access-title">Identidade e acesso</h2><p>Atualizado em {formatAdminDateTime(profile.updated_at)}.</p></div></div>
        <form action={updateUserAction} className={styles.adminForm}>
          <input name="id" type="hidden" value={profile.id} />
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input defaultValue={profile.name ?? ""} maxLength={120} name="name" /></label>
            <label className={styles.field}><span>E-mail</span><input disabled value={authUser.email ?? ""} /></label>
            {isSelf ? (
              <><input name="role" type="hidden" value={profile.role} /><label className={styles.field}><span>Papel</span><input disabled value="Administrador · autoedição bloqueada" /></label></>
            ) : (
              <label className={styles.field}><span>Papel</span><select defaultValue={profile.role} name="role"><option value="admin">Administrador</option><option value="editor">Editor</option><option value="attendant">Atendimento</option></select></label>
            )}
            <label className={styles.checkboxField}><input defaultChecked={profile.active} name="active" type="checkbox" /><span>Acesso ativo</span></label>
            {isSelf ? (
              <label className={`${styles.field} ${styles.fieldWide}`}><span>Para desativar o próprio acesso, digite DESATIVAR MEU ACESSO</span><input autoComplete="off" name="confirmation" /></label>
            ) : null}
          </div>
          {isSelf ? <p className={styles.notice}>Seu papel não pode ser alterado por esta tela. A desativação só funciona se outro administrador ativo existir.</p> : null}
          <AdminSubmitButton pendingLabel="Salvando acesso...">Salvar usuário</AdminSubmitButton>
        </form>
      </section>
    </>
  );
}

