import { House } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { VisionButton } from "@/components/vision-button";

import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page} id="main-content">
      <div className={styles.content}>
        <BrandLogo size="profile" />
        <p className="eyebrow">Erro 404</p>
        <h1>Pagina nao encontrada.</h1>
        <VisionButton href="/" icon={House}>
          Voltar ao inicio
        </VisionButton>
      </div>
    </main>
  );
}
