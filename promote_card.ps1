$content = Get-Content 'components\catalog\v2\catalog-product-card-v2.tsx' -Raw
$content = $content -replace 'catalog-product-card-v2.module.css', 'catalog-product-card.module.css'
$content = $content -replace 'export function CatalogProductCardV2\(', 'export function CatalogProductCard('
Set-Content -Path 'components\catalog\catalog-product-card.tsx' -Value $content
