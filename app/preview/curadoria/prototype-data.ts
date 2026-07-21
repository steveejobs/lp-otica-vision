export type OpticalBenchProduct = {
  alt: string;
  height: number;
  id: string;
  imageSrc: string;
  name: string;
  sku: string;
  slug: string;
  width: number;
};

function imageSrc(id: string, version: string) {
  const query = new URLSearchParams({ v: version, variant: "product_detail" });
  return `/api/catalogo/imagem/${encodeURIComponent(id)}?${query.toString()}`;
}

export const opticalBenchProducts: readonly OpticalBenchProduct[] = [
  {
    alt: "Imagem principal do produto Versace 01",
    height: 500,
    id: "eaa6da45-072e-4abd-9649-73b4418a887b",
    imageSrc: imageSrc("8ecc9267-3cf8-400c-bfc4-3176268eb3ea", "2026-07-20T19:42:23.65688+00:00"),
    name: "Versace 01",
    sku: "OV-00000064",
    slug: "versace-01",
    width: 870,
  },
  {
    alt: "Imagem principal do produto Versace 02",
    height: 447,
    id: "576eb21d-4762-44a7-aaaa-0b002ec40493",
    imageSrc: imageSrc("84573c74-dbe8-45ee-886a-0759c9fe9f3b", "2026-07-20T19:42:25.434839+00:00"),
    name: "Versace 02",
    sku: "OV-00000065",
    slug: "versace-02",
    width: 447,
  },
  {
    alt: "Imagem principal do produto Versace 03",
    height: 447,
    id: "5ae91d9e-ea80-4c43-8143-9280ab28e11a",
    imageSrc: imageSrc("8b4616a4-f3dd-435e-bc60-a873b5eb3db4", "2026-07-20T19:42:27.1896+00:00"),
    name: "Versace 03",
    sku: "OV-00000066",
    slug: "versace-03",
    width: 447,
  },
  {
    alt: "Imagem principal do produto Versace 04",
    height: 500,
    id: "0429b37c-bfe8-4215-8fcd-3b14ecffe953",
    imageSrc: imageSrc("b1cb8afb-e1d5-42ad-97c2-d822ee57de2c", "2026-07-20T19:42:28.923254+00:00"),
    name: "Versace 04",
    sku: "OV-00000067",
    slug: "versace-04",
    width: 870,
  },
] as const;

export function opticalBenchProduct(slug: string) {
  return opticalBenchProducts.find((product) => product.slug === slug) ?? null;
}

export function opticalBenchWhatsapp(product: OpticalBenchProduct) {
  const message = `Olá, gostaria de consultar o modelo ${product.name} (${product.sku}).`;
  const query = new URLSearchParams({
    app_absent: "0",
    phone: "5563992231522",
    text: message,
    type: "phone_number",
    utm_source: "showroom_preview",
  });
  return `https://api.whatsapp.com/send/?${query.toString()}`;
}
