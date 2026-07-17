const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Araguaina",
});

export function formatAdminDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Sem data";
}

export const availabilityLabels = {
  available: "Disponível",
  consultation: "Sob consulta",
  last_unit: "Última unidade",
  unavailable: "Indisponível",
} as const;

export const promotionTypeLabels = {
  collection: "Coleção",
  highlight: "Destaque",
  launch: "Lançamento",
  promotion: "Promoção",
} as const;
