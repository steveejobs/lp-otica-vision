const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "America/Araguaina",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Araguaina",
});

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function formatAdminDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Sem data";
}

export function formatAdminDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Sem data";
}

export function formatAdminMoney(value: number | null) {
  return value === null ? "Não informado" : moneyFormatter.format(value);
}

export function dateTimeInputValue(value: string | null) {
  if (!value) return "";
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Araguaina",
    year: "numeric",
  });
  return formatter.format(new Date(value)).replace(" ", "T");
}

export const availabilityLabels = {
  available: "Disponível",
  consultation: "Disponível",
  last_unit: "Última unidade",
  unavailable: "Indisponível",
} as const;

export const promotionTypeLabels = {
  collection: "Coleção",
  highlight: "Destaque",
  launch: "Lançamento",
  promotion: "Promoção",
} as const;
