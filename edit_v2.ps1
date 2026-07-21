$content = Get-Content 'components\catalog\v2\catalog-view-v2.tsx' -Raw
$content = $content -replace 'import \{ CatalogProductCard \} from "@/components/catalog/catalog-product-card";', 'import { CatalogProductCard } from "@/components/catalog/v2/catalog-product-card-v2";'
$content = $content -replace 'import styles from "../../app/catalogo/catalog.module.css";', 'import styles from "./catalog-view-v2.module.css";'
$content = $content -replace 'export function CatalogView\(', 'export function CatalogViewV2('

Set-Content -Path 'components\catalog\v2\catalog-view-v2.tsx' -Value $content
