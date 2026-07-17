import Link from "next/link";

import { AdminSubmitButton } from "@/components/admin/admin-form-controls";
import styles from "@/components/admin/admin.module.css";
import { AdminEmptyState, AdminFeedback, AdminPageHeader, AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { listAuthorizedAuthUsers } from "@/lib/admin/auth-users";
import { formatAdminDateTime } from "@/lib/admin/format";
import { requireAdminRole } from "@/lib/auth/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { inviteUserAction } from "./actions";

const roleLabels = { admin: "Administrador", attendant: "Atendimento", editor: "Editor" } as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const session = await requireAdminRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const [{ data: profiles, error }, authUsers] = await Promise.all([
    supabase.from("profiles").select("id, name, role, active, updated_at").order("updated_at", { ascending: false }),
    listAuthorizedAuthUsers(),
  ]);
  if (error || !profiles) throw new Error("Não foi possível carregar os usuários autorizados.");
  const query = await searchParams;
  const authMap = new Map(authUsers.map((user) => [user.id, user]));
  return (
    <>
      <AdminPageHeader eyebrow="Administração" description="Acesso somente por convite. Não existe cadastro público, senha padrão ou edição de papel pelo próprio usuário." title="Usuários" />
      <AdminFeedback error={query.error} status={query.status} />
      <section className={styles.formPanel} aria-labelledby="invite-user-title">
        <div className={styles.panelHeading}><div><h2 id="invite-user-title">Convidar usuário</h2><p>O Supabase enviará o fluxo de definição de senha; nenhuma senha é criada aqui.</p></div></div>
        <form action={inviteUserAction} className={styles.adminForm}>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Nome</span><input maxLength={120} name="name" /></label>
            <label className={styles.field}><span>E-mail</span><input autoComplete="off" maxLength={254} name="email" required type="email" /></label>
            <label className={styles.field}><span>Papel</span><select defaultValue="attendant" name="role"><option value="admin">Administrador</option><option value="editor">Editor</option><option value="attendant">Atendimento</option></select></label>
            <label className={styles.checkboxField}><input defaultChecked name="active" type="checkbox" /><span>Acesso ativo após aceitar convite</span></label>
          </div>
          <AdminSubmitButton pendingLabel="Enviando convite...">Enviar convite</AdminSubmitButton>
        </form>
      </section>
      <div className={styles.sectionBar}><h2>Usuários autorizados</h2><span className={styles.phaseBadge}>{profiles.length} registros</span></div>
      {profiles.length === 0 ? <AdminEmptyState>Nenhum perfil autorizado.</AdminEmptyState> : (
        <AdminTable label="Usuários autorizados">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Última atualização</th><th>Ações</th></tr></thead>
          <tbody>{profiles.map((profile) => {
            const authUser = authMap.get(profile.id);
            return (
              <tr key={profile.id}>
                <td>{profile.name ?? "Nome não informado"}{profile.id === session.profile.id ? " · você" : ""}</td>
                <td>{authUser?.email ?? "Identidade indisponível"}</td>
                <td>{roleLabels[profile.role]}</td>
                <td><AdminStatus active={profile.active} /></td>
                <td>{formatAdminDateTime(profile.updated_at)}</td>
                <td><Link className={styles.textButton} href={`/admin/usuarios/${profile.id}`}>Gerenciar</Link></td>
              </tr>
            );
          })}</tbody>
        </AdminTable>
      )}
    </>
  );
}

