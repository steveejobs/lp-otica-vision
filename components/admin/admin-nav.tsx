"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { AdminRole } from "@/lib/auth/admin-access";

import styles from "./admin.module.css";

const navigation = [
  { href: "/admin", label: "Visão geral", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/produtos", label: "Produtos", roles: ["admin", "editor"] },
  { href: "/admin/estilos", label: "Estilos", roles: ["admin", "editor"] },
  { href: "/admin/disponibilidade", label: "Disponibilidade", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/colecoes", label: "Coleções", roles: ["admin", "editor"] },
  { href: "/admin/galerias", label: "Galerias", roles: ["admin", "editor"] },
  { href: "/admin/promocoes", label: "Destaques", roles: ["admin", "editor"] },
  { href: "/admin/marcas", label: "Marcas", roles: ["admin", "editor"] },
  { href: "/admin/categorias", label: "Categorias", roles: ["admin", "editor"] },
  { href: "/admin/usuarios", label: "Usuários", roles: ["admin"] },
  { href: "/admin/analytics", label: "Analytics", roles: ["admin"] },
  { href: "/admin/auditoria", label: "Auditoria", roles: ["admin"] },
  { href: "/admin/configuracoes", label: "Configurações", roles: ["admin"] },
] as const satisfies readonly {
  href: string;
  label: string;
  roles: readonly AdminRole[];
}[];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleNavigation = navigation.filter((item) => (item.roles as readonly AdminRole[]).includes(role));
  const currentHref = visibleNavigation.find((item) => item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? "/admin";

  return (
    <>
      <label className={styles.mobileNavControl}>
        <span>Área da administração</span>
        <select aria-label="Área da administração" onChange={(event) => router.push(event.currentTarget.value)} value={currentHref}>
          {visibleNavigation.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
        </select>
      </label>
      <nav aria-label="Navegação administrativa" className={styles.nav}>
      {visibleNavigation.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? styles.navLinkActive : styles.navLink}
              href={item.href}
              key={item.href}
            >
              <AdminNavItem label={item.label} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function AdminNavItem({ label }: { label: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span aria-hidden="true" className={styles.navDot} data-pending={pending || undefined} />
      <span>{label}</span>
      <span aria-live="polite" className="sr-only">
        {pending ? "Carregando" : ""}
      </span>
    </>
  );
}
