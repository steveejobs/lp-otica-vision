import Image from "next/image";

import { brandLogos } from "@/lib/assets";

import styles from "./brand-rail.module.css";

export function BrandRail() {
  return (
    <section className={styles.section} aria-labelledby="brands-title" data-reveal>
      <div className="vision-container">
        <header className={styles.intro}>
          <h2 id="brands-title">Marcas que passam pela Vision</h2>
          <p>Consulte a disponibilidade dos modelos pelo WhatsApp.</p>
        </header>

        <ul className={styles.grid} aria-label="Marcas com logos confirmados">
          {brandLogos.map((brand) => (
            <li key={brand.name}>
              <span
                className={styles.logoSlot}
                style={{ "--logo-scale": brand.scale } as React.CSSProperties}
              >
                <Image
                  src={brand.src}
                  alt={`Logo ${brand.name}`}
                  fill
                  sizes="(max-width: 720px) 112px, 132px"
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
