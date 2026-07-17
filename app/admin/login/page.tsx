import { BrandLogo } from "@/components/brand-logo";
import styles from "@/components/admin/admin.module.css";

import { loginAdmin } from "./actions";
import { LoginSubmitButton } from "./submit-button";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
    status?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message =
    params.status === "inactive"
      ? "Seu acesso ainda não está ativo. Solicite a liberação a um administrador."
      : params.error === "invalid"
        ? "Não foi possível entrar. Confira as credenciais e tente novamente."
        : null;

  return (
    <main className={styles.loginPage} id="main-content">
      <div className={styles.loginAtmosphere} aria-hidden="true" />
      <section className={styles.loginCard} aria-labelledby="admin-login-title">
        <div className={styles.loginBrand}>
          <BrandLogo priority />
          <span>Gestão de catálogo</span>
        </div>

        <div className={styles.loginIntro}>
          <p className={styles.eyebrow}>Área reservada</p>
          <h1 id="admin-login-title">Curadoria, organizada.</h1>
          <p>
            Acesse com um usuário convidado para administrar o conteúdo da Ótica Vision.
          </p>
        </div>

        {message ? (
          <p className={styles.formMessage} role="alert">
            {message}
          </p>
        ) : null}

        <form action={loginAdmin} className={styles.loginForm}>
          <input name="next" type="hidden" value={params.next ?? "/admin"} />

          <label>
            <span>E-mail</span>
            <input
              autoComplete="username"
              inputMode="email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              autoComplete="current-password"
              maxLength={200}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>

          <LoginSubmitButton />
        </form>

        <p className={styles.loginFootnote}>
          Não existe cadastro público. Novos acessos são liberados somente por convite.
        </p>
      </section>
    </main>
  );
}
