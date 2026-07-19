"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

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
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function isPrimaryNavigation(event: MouseEvent<HTMLAnchorElement>) {
    return !(
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    );
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isPrimaryNavigation(event)) return;
    event.preventDefault();
    setPendingHref(href);
    router.push(href);
  }

  return (
    <nav aria-label="Navegação administrativa" className={styles.nav}>
      {navigation
        .filter((item) => (item.roles as readonly AdminRole[]).includes(role))
        .map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const pending = pendingHref === item.href && !active;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={pending ? `${item.label}, carregando` : item.label}
              className={active ? styles.navLinkActive : pending ? styles.navLinkPending : styles.navLink}
              data-pending={pending || undefined}
              href={item.href}
              key={item.href}
              onClickCapture={(event) => { if (isPrimaryNavigation(event)) event.preventDefault(); }}
              onClick={(event) => navigate(event, item.href)}
              prefetch={false}
            >
              <span aria-hidden="true" className={styles.navDot} />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
