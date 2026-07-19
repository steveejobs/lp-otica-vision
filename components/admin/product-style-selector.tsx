"use client";

import { useMemo, useState } from "react";

import styles from "./admin.module.css";

type StyleOption = {
  active: boolean;
  description: string;
  id: string;
  label: string;
};

export type ProductStyleAssignment = {
  displayOrder: number;
  isFeatured: boolean;
  isPrimary: boolean;
  styleId: string;
};

export function ProductStyleSelector({
  assignments = [],
  eligibilityReasons,
  options,
}: {
  assignments?: ProductStyleAssignment[];
  eligibilityReasons: string[];
  options: StyleOption[];
}) {
  const initialSelected = useMemo(() => assignments.map((item) => item.styleId), [assignments]);
  const [selected, setSelected] = useState(initialSelected);
  const [primary, setPrimary] = useState(assignments.find((item) => item.isPrimary)?.styleId ?? initialSelected[0] ?? "");
  const [search, setSearch] = useState("");
  const assignmentById = useMemo(() => new Map(assignments.map((item) => [item.styleId, item])), [assignments]);
  const visible = options.filter((option) => `${option.label} ${option.description}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR").trim()));

  function toggle(id: string, checked: boolean) {
    if (checked && selected.length >= 3) return;
    const next = checked ? [...selected, id] : selected.filter((item) => item !== id);
    setSelected(next);
    if (checked && !primary) setPrimary(id);
    if (!checked && primary === id) setPrimary(next[0] ?? "");
  }

  return (
    <section className={`${styles.fieldWide} ${styles.styleSelector}`} aria-labelledby="product-styles-title">
      <input name="styles_contract" type="hidden" value="1" />
      <div className={styles.panelHeading}>
        <div>
          <h3 id="product-styles-title">Estilos</h3>
          <p>Associe até três direções editoriais e defina exatamente uma como principal.</p>
        </div>
        <span className={styles.phaseBadge}>{selected.length}/3</span>
      </div>
      <label className={styles.field}>
        <span>Buscar estilo</span>
        <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nas opções" type="search" value={search} />
      </label>
      <div className={styles.styleOptions}>
        {visible.map((option) => {
          const checked = selected.includes(option.id);
          const assignment = assignmentById.get(option.id);
          return (
            <div className={styles.styleOption} data-selected={checked || undefined} key={option.id}>
              <label className={styles.checkboxField}>
                <input
                  checked={checked}
                  disabled={!option.active || (!checked && selected.length >= 3)}
                  name="style_ids"
                  onChange={(event) => toggle(option.id, event.target.checked)}
                  type="checkbox"
                  value={option.id}
                />
                <span>{option.label}{option.active ? "" : " · inativo"}</span>
              </label>
              <p>{option.description}</p>
              {checked ? (
                <div className={styles.styleControls}>
                  <label className={styles.checkboxField}>
                    <input checked={primary === option.id} name="style_primary" onChange={() => setPrimary(option.id)} required type="radio" value={option.id} />
                    <span>Principal</span>
                  </label>
                  <label className={styles.checkboxField}>
                    <input defaultChecked={assignment?.isFeatured} name="style_featured_ids" type="checkbox" value={option.id} />
                    <span>Destaque neste estilo</span>
                  </label>
                  <label className={styles.compactField}>
                    <span>Ordem editorial</span>
                    <input defaultValue={assignment?.displayOrder ?? 0} min="0" name={`style_order_${option.id}`} type="number" />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className={styles.eligibility} data-eligible={!eligibilityReasons.length || undefined}>
        <strong>{eligibilityReasons.length ? "Ainda não elegível para a curadoria" : "Elegível para a curadoria"}</strong>
        {eligibilityReasons.length ? <span>{eligibilityReasons.join(" · ")}</span> : <span>Capa, publicação e estilo ativo atendidos.</span>}
      </div>
    </section>
  );
}
