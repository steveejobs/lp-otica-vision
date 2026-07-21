import "server-only";

import { cache } from "react";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProductWhatsappInput = {
  model?: string | null;
  productName: string;
  productUrl: string;
};

function cleanLine(value: string, field: string, maxLength: number) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();

  if (!clean || clean.length > maxLength) {
    throw new Error(`${field} invalido para gerar o link do WhatsApp.`);
  }

  return clean;
}

function validateProductUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("URL do produto invalida para gerar o link do WhatsApp.");
  }

  const localHttp = url.protocol === "http:" && url.hostname === "localhost";
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("A URL do produto deve usar HTTPS.");
  }

  return url.toString();
}

const getOfficialPhone = cache(async function getOfficialPhone() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "whatsapp")
    .maybeSingle();

  if (error || !data || typeof data.value !== "object" || data.value === null) {
    throw new Error("Configuracao central do WhatsApp indisponivel.");
  }

  const phone = "phone" in data.value ? data.value.phone : null;

  if (typeof phone !== "string" || !/^\d{10,15}$/.test(phone)) {
    throw new Error("Telefone oficial do WhatsApp ainda nao foi configurado corretamente.");
  }

  return phone;
});

export function buildProductWhatsappUrlWithPhone(phone: string, input: ProductWhatsappInput) {
  const productName = cleanLine(input.productName, "Nome do produto", 160);
  const productUrl = validateProductUrl(input.productUrl);
  
  const message = `Olá! Vim pelo catálogo da Ótica Vision e quero consultar o modelo ${productName}.\n\n${productUrl}`;

  return `https://api.whatsapp.com/send/?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

export async function buildProductWhatsappUrl(input: ProductWhatsappInput) {
  const phone = await getOfficialPhone();
  return buildProductWhatsappUrlWithPhone(phone, input);
}
