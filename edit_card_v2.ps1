$content = Get-Content 'components\catalog\v2\catalog-product-card-v2.tsx' -Raw
$content = $content -replace 'import styles from "./catalog-product-card.module.css";', 'import styles from "./catalog-product-card-v2.module.css";'
$content = $content -replace 'export function CatalogProductCard\(', 'export function CatalogProductCardV2('
Set-Content -Path 'components\catalog\v2\catalog-product-card-v2.tsx' -Value $content
