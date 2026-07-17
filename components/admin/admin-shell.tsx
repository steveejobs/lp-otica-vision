import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import type { AdminRole, AdminSession } from "@/lib/auth/admin-access";

import styles from "./admin.module.css";
import { AdminNav } from "./admin-nav";

const roleLabels: Record<AdminRole, string> = {
  admin: "Administrador",
  attendant: "Atendimento",
  editor: "Editor",
};

type AdminShellProps = {
  children: React.ReactNode;
  onLogout: () => Promise<void>;
  profile: AdminSession["profile"];
};

export function AdminShell({ children, onLogout, profile }: AdminShellProps) {
  return (
    <div className={styles.adminRoot}>
      <aside className={styles.sidebar}>
        <Link className={styles.sidebarBrand} href="/admin" aria-label="Início do ADM">
          <BrandLogo priority />
          <span>Content studio</span>
        </Link>

        <AdminNav role={profile.role} />

        <div className={styles.sidebarFooter}>
          <div>
            <strong>{profile.name ?? "Equipe Vision"}</strong>
            <span>{roleLabels[profile.role]}</span>
          </div>
          <form action={onLogout}>
            <button className={styles.logoutButton} type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.adminCanvas}>
        <header className={styles.mobileHeader}>
          <Link href="/admin">Ótica Vision · ADM</Link>
          <div>
            <span>{roleLabels[profile.role]}</span>
            <form action={onLogout}>
              <button className={styles.logoutButton} type="submit">
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className={styles.adminMain} id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
