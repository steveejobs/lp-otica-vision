import type { CatalogAvailability, CatalogPriceVisibility } from "./types";

export const availabilityLabels: Record<CatalogAvailability, string> = {
  available: "Disponível",
  last_unit: "Última unidade",
  unavailable: "Indisponível",
};

export const availabilityShortLabels: Record<CatalogAvailability, string> = {
  available: "Disponível",
  last_unit: "Última unidade",
  unavailable: "Indisponível",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function formatCatalogPrice(
  price: number | null,
  visibility: CatalogPriceVisibility,
) {
  if (visibility !== "visible" || price === null || price <= 0) return "R$ Sob consulta";
  return currencyFormatter.format(price);
}
