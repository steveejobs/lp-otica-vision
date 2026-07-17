import styles from "./admin.module.css";

const feedbackMessages: Record<string, string> = {
  archived: "Registro arquivado com segurança.",
  approved: "Acesso aprovado.",
  blocked: "Acesso bloqueado.",
  constraint: "A operação viola uma regra de integridade. Revise os campos e vínculos.",
  created: "Registro criado com sucesso.",
  date: "Informe uma data e hora válidas.",
  date_window: "A data final não pode ser anterior à inicial.",
  deleted: "Registro removido com segurança.",
  duplicate: "Já existe um registro com esse slug, SKU ou identificador.",
  email: "Informe um e-mail válido.",
  existing: "A coleção já existia; carreguei o editor dela.",
  failed: "Não foi possível concluir a operação. Tente novamente.",
  forbidden: "Seu papel não permite executar esta ação.",
  image: "A imagem não passou na validação de formato, tamanho ou dimensões.",
  invalid: "Revise os campos informados.",
  invalid_order: "A ordenação enviada não corresponde aos itens atuais.",
  invited: "Convite enviado. O perfil ficou pendente para aprovação do administrador.",
  length: "Um ou mais campos excedem o tamanho permitido.",
  linked: "O registro possui vínculos e não pode ser excluído diretamente.",
  number: "Informe um número válido e não negativo.",
  position: "Use um enquadramento como “50% 50%”.",
  price: "Informe um preço válido e não negativo.",
  removed: "Imagem removida com segurança.",
  reordered: "Nova ordem salva.",
  required: "Preencha todos os campos obrigatórios.",
  role: "Alteração de papel bloqueada por segurança.",
  route: "A chave de rota contém caracteres inválidos.",
  saved: "Alterações salvas.",
  slug: "Use um slug em minúsculas, sem espaços ou acentos.",
  uploaded: "Imagem armazenada e vinculada com sucesso.",
};

export function AdminPageHeader({
  description,
  eyebrow = "Ótica Vision",
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <p>{description}</p>
    </header>
  );
}

export function AdminEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.emptyState}>
      <span aria-hidden="true">V</span>
      <div>
        <strong>Nenhum registro por enquanto.</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function AdminStatus({
  active,
  falseLabel = "Inativo",
  trueLabel = "Ativo",
}: {
  active: boolean;
  falseLabel?: string;
  trueLabel?: string;
}) {
  return (
    <span className={active ? styles.statusPositive : styles.statusNeutral}>
      {active ? trueLabel : falseLabel}
    </span>
  );
}

export function AdminFeedback({ error, status }: { error?: string; status?: string }) {
  const code = error ?? status;
  if (!code) return null;
  return (
    <p className={error ? styles.formError : styles.formSuccess} role={error ? "alert" : "status"}>
      {feedbackMessages[code] ?? (error ? feedbackMessages.failed : feedbackMessages.saved)}
    </p>
  );
}

export function AdminTable({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className={styles.tableFrame} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
