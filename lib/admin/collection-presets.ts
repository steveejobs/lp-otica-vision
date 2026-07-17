export type CollectionPresetId = "destaques" | "inverno" | "verao" | "outono" | "primavera";

export type CollectionPreset = {
  description: string;
  displayOrder: number;
  guide: string;
  id: CollectionPresetId;
  label: string;
  name: string;
  slug: string;
};

export const COLLECTION_PRESETS = [
  {
    description: "Seleção editorial de armações para a vitrine da Vision.",
    displayOrder: 0,
    guide: "Use como curadoria principal. Publique como destaque só depois de revisar capa e produtos.",
    id: "destaques",
    label: "Destaques",
    name: "Destaques",
    slug: "destaques",
  },
  {
    description: "Curadoria de armações para a coleção Inverno.",
    displayOrder: 10,
    guide: "Organize produtos com leitura mais sóbria e mantenha a ordem editorial da coleção.",
    id: "inverno",
    label: "Inverno",
    name: "Inverno",
    slug: "inverno",
  },
  {
    description: "Curadoria de armações para a coleção Verão.",
    displayOrder: 20,
    guide: "Use para compor uma seleção sazonal sem criar promessa comercial automática.",
    id: "verao",
    label: "Verão",
    name: "Verão",
    slug: "verao",
  },
  {
    description: "Curadoria de armações para a coleção Outono.",
    displayOrder: 30,
    guide: "Mantenha capa, alt text e produtos revisados antes de publicar.",
    id: "outono",
    label: "Outono",
    name: "Outono",
    slug: "outono",
  },
  {
    description: "Curadoria de armações para a coleção Primavera.",
    displayOrder: 40,
    guide: "Completa o grupo das quatro estações com o mesmo fluxo de rascunho e publicação.",
    id: "primavera",
    label: "Primavera",
    name: "Primavera",
    slug: "primavera",
  },
] as const satisfies readonly CollectionPreset[];

export function getCollectionPreset(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  return COLLECTION_PRESETS.find((preset) => preset.id === value) ?? null;
}
