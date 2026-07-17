import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const FIXTURE_LABEL = "[FIXTURE FASE 2]";
const FIXTURE_SLUG_PREFIX = "fixture-fase2-";
const statePath = path.resolve(".tmp/admin-qa/phase2-fixtures.json");
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

function makeClient(key) {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function emptyState() {
  return {
    auditEntityIds: [],
    brandIds: [],
    categoryIds: [],
    collectionIds: [],
    galleryIds: [],
    galleryItemIds: [],
    marker: FIXTURE_LABEL,
    productIds: [],
    productImageIds: [],
    promotionIds: [],
    runId: `${Date.now()}-${randomUUID().slice(0, 8)}`,
    storage: [],
    version: 1,
  };
}

function persist(state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function readState() {
  if (!fs.existsSync(statePath)) return null;
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function trackEntity(state, collection, id) {
  state[collection].push(id);
  state.auditEntityIds.push(id);
  persist(state);
}

async function insertOne(client, table, payload) {
  const { data, error } = await client.from(table).insert(payload).select("*").single();
  if (error || !data) throw new Error(`Falha ao criar fixture em ${table}.`);
  return data;
}

async function upload(actor, state, bucket, parentId) {
  const storagePath = `${parentId}/${randomUUID()}.png`;
  const { error } = await actor.storage.from(bucket).upload(storagePath, png, {
    cacheControl: "3600",
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw new Error(`Falha ao enviar fixture para ${bucket}.`);
  state.storage.push({ bucket, path: storagePath });
  persist(state);
  return storagePath;
}

async function actorClient() {
  const actor = makeClient(required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
  const { data, error } = await actor.auth.signInWithPassword({
    email: required("QA_ADMIN_EMAIL"),
    password: required("QA_ADMIN_PASSWORD"),
  });
  if (error || !data.user) throw new Error("Falha ao autenticar o administrador de QA.");
  const { data: profile, error: profileError } = await actor
    .from("profiles")
    .select("id, role, active")
    .eq("id", data.user.id)
    .single();
  if (profileError || profile?.role !== "admin" || profile.active !== true) {
    throw new Error("O usuario de QA nao possui acesso administrativo ativo.");
  }
  return actor;
}

async function seedFixtures() {
  if (readState()) throw new Error("Fixtures da Fase 2 ja estao ativas; limpe antes de semear.");

  const actor = await actorClient();
  const state = emptyState();
  persist(state);
  const slugBase = `${FIXTURE_SLUG_PREFIX}${state.runId}`;

  try {
    for (let index = 0; index < 2; index += 1) {
      const id = randomUUID();
      const logoPath = await upload(actor, state, "brand-logos", id);
      await insertOne(actor, "brands", {
        active: true,
        display_order: index,
        id,
        logo_url: logoPath,
        name: `${FIXTURE_LABEL} Marca ${index + 1}`,
        slug: `${slugBase}-marca-${index + 1}`,
      });
      trackEntity(state, "brandIds", id);
    }

    for (let index = 0; index < 2; index += 1) {
      const id = randomUUID();
      await insertOne(actor, "categories", {
        active: true,
        display_order: index,
        id,
        name: `${FIXTURE_LABEL} Categoria ${index + 1}`,
        slug: `${slugBase}-categoria-${index + 1}`,
      });
      trackEntity(state, "categoryIds", id);
    }

    const availabilities = ["available", "last_unit", "consultation", "unavailable", "consultation"];
    for (let index = 0; index < 5; index += 1) {
      const id = randomUUID();
      await insertOne(actor, "products", {
        availability_status: availabilities[index],
        brand_id: state.brandIds[index % state.brandIds.length],
        category_id: state.categoryIds[index % state.categoryIds.length],
        color: `Cor de teste ${index + 1}`,
        display_order: index,
        featured: false,
        id,
        model: `Modelo fixture ${index + 1}`,
        name: `${FIXTURE_LABEL} Produto ${index + 1}`,
        price: index % 2 === 0 ? null : 199.9 + index,
        price_visibility: index % 2 === 0 ? "consult" : "visible",
        published: false,
        short_description: "Registro temporario e identificado para QA do ADM.",
        sku: `FIXTURE-${state.runId}-${index + 1}`.toUpperCase(),
        slug: `${slugBase}-produto-${index + 1}`,
        whatsapp_message_override: "Mensagem temporaria de QA da Fase 2.",
      });
      trackEntity(state, "productIds", id);

      const storagePath = await upload(actor, state, "catalog-products", id);
      const imageId = randomUUID();
      await insertOne(actor, "product_images", {
        alt_text: `${FIXTURE_LABEL} Imagem de teste do produto ${index + 1}`,
        display_order: 0,
        height: 1,
        id: imageId,
        is_cover: true,
        object_position: "50% 50%",
        product_id: id,
        storage_path: storagePath,
        width: 1,
      });
      trackEntity(state, "productImageIds", imageId);

      if (index < 3) {
        const { error } = await actor
          .from("products")
          .update({ featured: index === 0, published: true })
          .eq("id", id);
        if (error) throw new Error("Falha ao publicar produto fixture.");
      }
    }

    const collectionId = randomUUID();
    const collectionCover = await upload(actor, state, "site-galleries", collectionId);
    await insertOne(actor, "collections", {
      cover_alt_text: `${FIXTURE_LABEL} Capa da colecao de teste`,
      cover_height: 1,
      cover_object_position: "50% 50%",
      cover_path: collectionCover,
      cover_width: 1,
      description: "Colecao temporaria para QA da Fase 2.",
      display_order: 0,
      featured: true,
      id: collectionId,
      name: `${FIXTURE_LABEL} Colecao`,
      published: true,
      slug: `${slugBase}-colecao`,
    });
    trackEntity(state, "collectionIds", collectionId);
    const collectionOrder = [state.productIds[1], state.productIds[0], state.productIds[2]];
    const { error: collectionOrderError } = await actor.rpc("sync_collection_products", {
      ordered_product_ids: collectionOrder,
      target_collection_id: collectionId,
    });
    if (collectionOrderError) throw new Error("Falha ao ordenar produtos da colecao fixture.");
    for (const productId of collectionOrder) {
      state.auditEntityIds.push(`${collectionId}:${productId}`);
    }
    persist(state);

    const galleryId = randomUUID();
    await insertOne(actor, "galleries", {
      autoplay: true,
      display_order: 0,
      id: galleryId,
      name: `${FIXTURE_LABEL} Galeria`,
      published: false,
      route_key: `${slugBase}-galeria`,
      slug: `${slugBase}-galeria`,
    });
    trackEntity(state, "galleryIds", galleryId);
    const galleryItems = [];
    for (let index = 0; index < 3; index += 1) {
      const storagePath = await upload(actor, state, "site-galleries", galleryId);
      const itemId = randomUUID();
      await insertOne(actor, "gallery_items", {
        alt_text: `${FIXTURE_LABEL} Imagem de teste da galeria ${index + 1}`,
        desktop_object_position: "50% 50%",
        display_order: index,
        gallery_id: galleryId,
        height: 1,
        id: itemId,
        mobile_object_position: "50% 50%",
        published: true,
        series_order: index < 2 ? index : null,
        storage_path: storagePath,
        visual_series: index < 2 ? "fixture-serie-a" : null,
        width: 1,
      });
      galleryItems.push(itemId);
      trackEntity(state, "galleryItemIds", itemId);
    }
    const { error: galleryOrderError } = await actor.rpc("reorder_gallery_items", {
      ordered_ids: [galleryItems[2], galleryItems[0], galleryItems[1]],
      target_gallery_id: galleryId,
    });
    if (galleryOrderError) throw new Error("Falha ao ordenar a galeria fixture.");
    const { error: galleryPublishError } = await actor
      .from("galleries")
      .update({ published: true })
      .eq("id", galleryId);
    if (galleryPublishError) throw new Error("Falha ao publicar a galeria fixture.");

    const promotionId = randomUUID();
    const promotionImage = await upload(actor, state, "promotions", promotionId);
    const startsAt = new Date(Date.now() - 86_400_000).toISOString();
    const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
    await insertOne(actor, "promotions", {
      active: true,
      cta_label: "Falar no WhatsApp",
      cta_target: "whatsapp",
      ends_at: endsAt,
      featured: true,
      id: promotionId,
      image_alt_text: `${FIXTURE_LABEL} Imagem da promocao de teste`,
      image_height: 1,
      image_object_position: "50% 50%",
      image_path: promotionImage,
      image_width: 1,
      priority: 10,
      short_description: "Promocao temporaria sem desconto inventado.",
      slug: `${slugBase}-promocao`,
      starts_at: startsAt,
      title: `${FIXTURE_LABEL} Promocao`,
      type: "promotion",
    });
    trackEntity(state, "promotionIds", promotionId);
    const promotionOrder = [state.productIds[2], state.productIds[0]];
    const { error: promotionOrderError } = await actor.rpc("sync_promotion_products", {
      ordered_product_ids: promotionOrder,
      target_promotion_id: promotionId,
    });
    if (promotionOrderError) throw new Error("Falha ao relacionar produtos da promocao fixture.");
    for (const productId of promotionOrder) {
      state.auditEntityIds.push(`${promotionId}:${productId}`);
    }
    persist(state);

    await actor.auth.signOut();
    return state;
  } catch (error) {
    await actor.auth.signOut();
    await cleanupFixtures(state);
    throw error;
  }
}

async function removeRows(admin, table, column, ids) {
  if (!ids?.length) return;
  const { error } = await admin.from(table).delete().in(column, ids);
  if (error) throw new Error(`Falha ao limpar fixtures de ${table}.`);
}

async function cleanupFixtures(providedState = readState()) {
  if (!providedState) return { cleaned: true, found: false };
  const admin = makeClient(required("SUPABASE_SECRET_KEY"));

  await removeRows(admin, "promotions", "id", providedState.promotionIds);
  await removeRows(admin, "galleries", "id", providedState.galleryIds);
  await removeRows(admin, "collections", "id", providedState.collectionIds);
  await removeRows(admin, "products", "id", providedState.productIds);
  await removeRows(admin, "brands", "id", providedState.brandIds);
  await removeRows(admin, "categories", "id", providedState.categoryIds);

  for (const [bucket, entries] of Object.entries(
    Object.groupBy(providedState.storage ?? [], (entry) => entry.bucket),
  )) {
    const paths = entries.map((entry) => entry.path);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }

  const entityIds = [...new Set(providedState.auditEntityIds ?? [])];
  for (let index = 0; index < entityIds.length; index += 100) {
    await admin.from("audit_logs").delete().in("entity_id", entityIds.slice(index, index + 100));
  }
  if (fs.existsSync(statePath)) fs.rmSync(statePath);
  return { cleaned: true, found: true };
}

async function fixtureCounts() {
  const admin = makeClient(required("SUPABASE_SECRET_KEY"));
  const tables = ["brands", "categories", "products", "collections", "galleries", "promotions"];
  const counts = {};
  for (const table of tables) {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .ilike("slug", `${FIXTURE_SLUG_PREFIX}%`);
    if (error) throw new Error(`Falha ao inspecionar fixtures de ${table}.`);
    counts[table] = count ?? 0;
  }
  return counts;
}

const command = process.argv[2] ?? "status";
try {
  if (command === "seed") {
    const state = await seedFixtures();
    console.log(JSON.stringify({
      fixture: FIXTURE_LABEL,
      seeded: {
        brands: state.brandIds.length,
        categories: state.categoryIds.length,
        collections: state.collectionIds.length,
        galleries: state.galleryIds.length,
        products: state.productIds.length,
        promotions: state.promotionIds.length,
        testImages: state.storage.length,
      },
    }, null, 2));
  } else if (command === "cleanup") {
    const result = await cleanupFixtures();
    console.log(JSON.stringify({ ...result, remaining: await fixtureCounts() }, null, 2));
  } else if (command === "status") {
    console.log(JSON.stringify({ activeState: Boolean(readState()), counts: await fixtureCounts() }, null, 2));
  } else {
    throw new Error("Comando invalido. Use seed, cleanup ou status.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha nas fixtures da Fase 2.");
  process.exitCode = 1;
}
