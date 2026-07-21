$content = Get-Content 'app\preview\catalogo\page.tsx' -Raw
$content = $content -replace 'import \{ CatalogViewV2 \} from "@/components/catalog/v2/catalog-view-v2";', 'import { CatalogView } from "@/components/catalog/catalog-view";'
$content = $content -replace '<CatalogViewV2', '<CatalogView'
Set-Content -Path 'app\preview\catalogo\page.tsx' -Value $content
