import styles from "./admin.module.css";

const BRAND_BACKGROUNDS = [
  { label: "Automático", value: "", swatch: "#eee8e0" },
  { label: "Areia suave", value: "#d7c3ad", swatch: "#d7c3ad" },
  { label: "Papel claro", value: "#fbf8f3", swatch: "#fbf8f3" },
  { label: "Champagne", value: "#c7ad8e", swatch: "#c7ad8e" },
  { label: "Bege Vision", value: "#b19475", swatch: "#b19475" },
] as const;

export function BackgroundColorField({ initialValue, name = "background_color" }: { initialValue?: string | null; name?: string }) {
  const current = initialValue ?? "";
  const known = BRAND_BACKGROUNDS.some((option) => option.value === current);
  const options = known || !current
    ? BRAND_BACKGROUNDS
    : [...BRAND_BACKGROUNDS, { label: "Cor já salva", value: current, swatch: current }];

  return (
    <fieldset className={styles.colorField}>
      <legend>Fundo atrás da foto</legend>
      <p>Essa cor só aparece nas bordas quando o enquadramento deixa alguma área livre. Ela não altera as cores da imagem.</p>
      <div className={styles.colorChoiceGrid}>
        {options.map((option) => (
          <label key={option.label}>
            <input defaultChecked={option.value === current} name={name} type="radio" value={option.value} />
            <span><i aria-hidden="true" style={{ background: option.swatch }} />{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
