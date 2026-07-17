import type { CatalogAvailability, CatalogPriceVisibility } from "./types";

export const availabilityLabels: Record<CatalogAvailability, string> = {
  available: "Disponível",
  consultation: "Consulte disponibilidade",
  last_unit: "Última unidade",
  unavailable: "Indisponível",
};

export const availabilityShortLabels: Record<CatalogAvailability, string> = {
  available: "Disponível",
  consultation: "Sob consulta",
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
  if (visibility === "hidden") return null;
  if (visibility === "consult") return "Consulte";
  return price === null ? null : currencyFormatter.format(price);
}
