import styles from "./ui-placeholders.module.css";

export function BrandRail() {
  const brands = [
    { name: "Prada", active: true, count: 12 },
    { name: "Versace", active: false, count: 8 },
    { name: "Ray-Ban", active: false, count: 24 },
    { name: "Oakley", active: false, count: 0 }, // Should look faded
  ];

  return (
    <div className={styles.brandRail}>
      {brands.map((brand) => (
        <button 
          key={brand.name} 
          className={`${styles.brandItem} ${brand.active ? styles.active : ""} ${brand.count === 0 ? styles.empty : ""}`}
          disabled={brand.count === 0}
        >
          <span className={styles.brandName}>{brand.name}</span>
        </button>
      ))}
    </div>
  );
}

export function CompactFilters() {
  return (
    <div className={styles.filtersBar}>
      <div className={styles.desktopFilters}>
        <button className={styles.filterChip}>Categoria: Sol</button>
        <button className={styles.filterChip}>Disponibilidade: Pronta Entrega</button>
      </div>
      <div className={styles.mobileFilters}>
        <button className={styles.mobileFilterBtn}>
          Filtrar <span className={styles.filterBadge}>2</span>
        </button>
      </div>
      <div className={styles.searchBox}>
        <input type="text" placeholder="Buscar modelos..." className={styles.searchInput} disabled />
      </div>
    </div>
  );
}
