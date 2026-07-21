$content = Get-Content 'components\catalog\v2\catalog-view-v2.tsx' -Raw
$content = $content -replace 'CatalogProductCardV2', 'CatalogProductCard'
$content = $content -replace 'catalog-product-card-v2', 'catalog-product-card'
$content = $content -replace 'catalog-view-v2.module.css', 'catalog.module.css'
$content = $content -replace 'export function CatalogViewV2\(', 'export function CatalogView('

Set-Content -Path 'components\catalog\catalog-view.tsx' -Value $content
