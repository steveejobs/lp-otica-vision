import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LINKS } from "@/lib/links";

import catalogStyles from "../catalog.module.css";

export default function ProductNotFound() {
  return (
    <div className={catalogStyles.page}>
      <SiteHeader />
      <main id="main-content">
        <section className={catalogStyles.results}>
          <div className={catalogStyles.resultsInner}>
            <div className={catalogStyles.empty}>
              <p className="eyebrow">Catálogo Vision</p>
              <h1>Este produto não está publicado.</h1>
              <p>Volte à seleção atual ou consulte nossa equipe.</p>
              <div className={catalogStyles.emptyActions}>
                <Link href="/catalogo">Ver catálogo</Link>
                <a href={LINKS.whatsapp} rel="noopener noreferrer" target="_blank">WhatsApp</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
