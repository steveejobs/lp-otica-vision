import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const statePath = path.resolve(".tmp/admin-qa/phase2-fixtures.json");
const fixtureLabel = "[FIXTURE FASE 3]";
const photoPaths = [
  "public/media/photos/1 (1).jpg",
  "public/media/photos/1 (2).jpg",
  "public/media/photos/1 (3).jpg",
  "public/media/photos/3 (1).jpg",
  "public/media/photos/4 (1).jpg",
  "public/media/photos/4 (2).jpg",
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

function readState() {
  if (!fs.existsSync(statePath)) {
    throw new Error("As fixtures efemeras da Fase 2 precisam estar ativas.");
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function persist(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SECRET_KEY"),
  { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
);

async function uploadPhoto(productId, sourcePath) {
  const bytes = fs.readFileSync(path.resolve(sourcePath));
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== "jpeg") {
    throw new Error("Imagem local de fixture invalida.");
  }
  const storagePath = `${productId}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("catalog-products").upload(storagePath, bytes, {
    cacheControl: "31536000",
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("Falha ao enviar imagem visual da fixture.");
  return { height: metadata.height, path: storagePath, width: metadata.width };
}

async function prepare() {
  const state = readState();
  if (state.phase3?.prepared) throw new Error("Fixtures da Fase 3 ja foram preparadas.");

  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path")
    .in("product_id", state.productIds)
    .eq("is_cover", true);
  if (imageError || images?.length !== state.productIds.length) {
    throw new Error("Capas das fixtures nao foram encontradas.");
  }

  const productNames = [
    `${fixtureLabel} Oculos Aureo`,
    `${fixtureLabel} Aviador Ensaio`,
    `${fixtureLabel} Linha Clara`,
    `${fixtureLabel} Modelo Editorial`,
    `${fixtureLabel} Armacao Studio`,
  ];
  const accentedNames = [
    `${fixtureLabel} Óculos Áureo`,
    `${fixtureLabel} Aviador Ensaio`,
    `${fixtureLabel} Linha Clara`,
    `${fixtureLabel} Modelo Editorial`,
    `${fixtureLabel} Armação Studio`,
  ];

  for (const [index, productId] of state.productIds.entries()) {
    const image = images.find((item) => item.product_id === productId);
    if (!image) throw new Error("Capa da fixture ausente.");
    const uploaded = await uploadPhoto(productId, photoPaths[index]);
    const { error: updateImageError } = await supabase
      .from("product_images")
      .update({
        alt_text: `${fixtureLabel} Imagem temporaria de ${productNames[index]}`,
        height: uploaded.height,
        object_position: index % 2 === 0 ? "50% 42%" : "50% 50%",
        storage_path: uploaded.path,
        width: uploaded.width,
      })
      .eq("id", image.id);
    if (updateImageError) {
      await supabase.storage.from("catalog-products").remove([uploaded.path]);
      throw new Error("Falha ao substituir capa da fixture.");
    }
    await supabase.storage.from("catalog-products").remove([image.storage_path]);
    state.storage = state.storage.filter(
      (entry) => !(entry.bucket === "catalog-products" && entry.path === image.storage_path),
    );
    state.storage.push({ bucket: "catalog-products", path: uploaded.path });
    persist(state);

    const { error: productError } = await supabase
      .from("products")
      .update({
        featured: true,
        name: accentedNames[index],
        published: true,
        short_description: `${fixtureLabel} Registro temporario para validar o catalogo publico.`,
      })
      .eq("id", productId);
    if (productError) throw new Error("Falha ao publicar produto da fixture da Fase 3.");
  }

  const firstProductId = state.productIds[0];
  const secondImage = await uploadPhoto(firstProductId, photoPaths[5]);
  const secondImageId = randomUUID();
  const { error: secondImageError } = await supabase.from("product_images").insert({
    alt_text: `${fixtureLabel} Segunda imagem temporaria do primeiro produto`,
    display_order: 1,
    height: secondImage.height,
    id: secondImageId,
    is_cover: false,
    object_position: "50% 45%",
    product_id: firstProductId,
    storage_path: secondImage.path,
    width: secondImage.width,
  });
  if (secondImageError) {
    await supabase.storage.from("catalog-products").remove([secondImage.path]);
    throw new Error("Falha ao adicionar segunda imagem da fixture.");
  }
  state.productImageIds.push(secondImageId);
  state.auditEntityIds.push(secondImageId);
  state.storage.push({ bucket: "catalog-products", path: secondImage.path });

  const brandNames = [`${fixtureLabel} Visao Teste`, `${fixtureLabel} Linha Ensaio`];
  for (const [index, brandId] of state.brandIds.entries()) {
    const { error } = await supabase.from("brands").update({ name: brandNames[index] }).eq("id", brandId);
    if (error) throw new Error("Falha ao nomear marca da fixture.");
  }
  const categoryNames = [`${fixtureLabel} Solar`, `${fixtureLabel} Grau`];
  for (const [index, categoryId] of state.categoryIds.entries()) {
    const { error } = await supabase.from("categories").update({ name: categoryNames[index] }).eq("id", categoryId);
    if (error) throw new Error("Falha ao nomear categoria da fixture.");
  }

  const { error: clearCollectionError } = await supabase
    .from("collection_products")
    .delete()
    .eq("collection_id", state.collectionIds[0]);
  const { error: collectionError } = await supabase.from("collection_products").insert(
    state.productIds.map((productId, index) => ({
      collection_id: state.collectionIds[0],
      display_order: index,
      product_id: productId,
    })),
  );
  if (clearCollectionError || collectionError) throw new Error("Falha ao ampliar colecao da fixture.");
  for (const productId of state.productIds) {
    state.auditEntityIds.push(`${state.collectionIds[0]}:${productId}`);
  }

  state.phase3 = {
    prepared: true,
    productNames: accentedNames,
    secondImageId,
  };
  persist(state);

  return {
    featuredPublishedProducts: state.productIds.length,
    fixture: fixtureLabel,
    productImages: state.productImageIds.length,
  };
}

try {
  if ((process.argv[2] ?? "prepare") !== "prepare") throw new Error("Use apenas o comando prepare.");
  console.log(JSON.stringify(await prepare(), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha ao preparar fixtures da Fase 3.");
  process.exitCode = 1;
}
