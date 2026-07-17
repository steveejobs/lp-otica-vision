"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AdminRole } from "@/lib/auth/admin-access";

import styles from "./admin.module.css";

const navigation = [
  { href: "/admin", label: "Visão geral", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/produtos", label: "Produtos", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/colecoes", label: "Coleções", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/galerias", label: "Galerias", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/promocoes", label: "Destaques", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/marcas", label: "Marcas", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/categorias", label: "Categorias", roles: ["admin", "editor", "attendant"] },
  { href: "/admin/configuracoes", label: "Configurações", roles: ["admin"] },
] as const satisfies readonly {
  href: string;
  label: string;
  roles: readonly AdminRole[];
}[];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação administrativa" className={styles.nav}>
      {navigation
        .filter((item) => (item.roles as readonly AdminRole[]).includes(role))
        .map((item) => {
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
              <span aria-hidden="true" className={styles.navDot} />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}
