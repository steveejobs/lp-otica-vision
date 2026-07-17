import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = required("SUPABASE_SECRET_KEY");
const fixtureStatePath = path.resolve(".tmp/admin-qa/phase2-fixtures.json");
if (!fs.existsSync(fixtureStatePath)) {
  throw new Error("As fixtures efemeras da Fase 2 precisam estar ativas para este QA.");
}
const fixtures = JSON.parse(fs.readFileSync(fixtureStatePath, "utf8"));
const admin = client(secretKey);
const results = [];
const cleanup = {
  auditEntityIds: [],
  brandIds: [],
  categoryIds: [],
  collectionIds: [],
  galleryIds: [],
  imageIds: [],
  productIds: [],
  promotionIds: [],
  settingKeys: [],
  storage: [],
  userIds: [],
};
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

function client(key = publishableKey) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function record(name, passed) {
  results.push({ name, passed: Boolean(passed) });
}

function entity(collection, id) {
  cleanup[collection].push(id);
  cleanup.auditEntityIds.push(id);
  return id;
}

async function createQaUser(role, active) {
  const email = `qa-phase2-${randomUUID()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}aA1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: { name: "QA Fase 2" },
  });
  if (error || !data.user) throw new Error("Falha ao criar identidade temporaria de QA.");
  cleanup.userIds.push(data.user.id);
  cleanup.auditEntityIds.push(data.user.id);
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .update({ active, name: "QA Fase 2", role })
    .eq("id", data.user.id)
    .select("id")
    .single();
  if (profileError || !profile) throw new Error("Falha ao configurar papel temporario de QA.");
  const actor = client();
  const { error: signInError } = await actor.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error("Falha ao autenticar papel temporario de QA.");
  return { client: actor, id: data.user.id };
}

async function realAdminClient() {
  const actor = client();
  const { data, error } = await actor.auth.signInWithPassword({
    email: required("QA_ADMIN_EMAIL"),
    password: required("QA_ADMIN_PASSWORD"),
  });
  if (error || !data.user) throw new Error("Falha ao autenticar administrador real no QA.");
  const { data: profile, error: profileError } = await actor
    .from("profiles")
    .select("id, role, active")
    .eq("id", data.user.id)
    .single();
  if (profileError || profile?.role !== "admin" || profile.active !== true) {
    throw new Error("Administrador real nao esta ativo no QA.");
  }
  return { client: actor, id: data.user.id };
}

async function upload(actor, bucket, parentId, bytes = png, contentType = "image/png") {
  const extension = contentType === "image/svg+xml" ? "svg" : "png";
  const storagePath = `${parentId}/${randomUUID()}.${extension}`;
  const result = await actor.storage.from(bucket).upload(storagePath, bytes, {
    contentType,
    upsert: false,
  });
  return { ...result, storagePath };
}

async function removeRows(table, ids) {
  if (!ids.length) return;
  await admin.from(table).delete().in("id", ids);
}

async function cleanupQa() {
  await removeRows("promotions", cleanup.promotionIds);
  await removeRows("galleries", cleanup.galleryIds);
  await removeRows("collections", cleanup.collectionIds);
  await removeRows("products", cleanup.productIds);
  await removeRows("brands", cleanup.brandIds);
  await removeRows("categories", cleanup.categoryIds);
  if (cleanup.settingKeys.length) {
    await admin.from("site_settings").delete().in("key", cleanup.settingKeys);
  }
  for (const [bucket, entries] of Object.entries(Object.groupBy(cleanup.storage, (entry) => entry.bucket))) {
    const paths = entries.map((entry) => entry.path);
    if (paths.length) await admin.storage.from(bucket).remove(paths);
  }
  for (const userId of cleanup.userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
  const ids = [...new Set(cleanup.auditEntityIds)];
  for (let index = 0; index < ids.length; index += 100) {
    await admin.from("audit_logs").delete().in("entity_id", ids.slice(index, index + 100));
  }
}

let fatalError = false;
try {
  const realAdmin = await realAdminClient();
  const editor = await createQaUser("editor", true);
  const attendant = await createQaUser("attendant", true);
  const inactive = await createQaUser("editor", false);
  const anonymous = client();

  const fixtureChecks = [
    ["brands", fixtures.brandIds, 2],
    ["categories", fixtures.categoryIds, 2],
    ["products", fixtures.productIds, 5],
    ["collections", fixtures.collectionIds, 1],
    ["galleries", fixtures.galleryIds, 1],
    ["promotions", fixtures.promotionIds, 1],
  ];
  let fixtureShapeValid = true;
  for (const [table, ids, expected] of fixtureChecks) {
    const { data, error } = await realAdmin.client.from(table).select("id").in("id", ids);
    fixtureShapeValid &&= !error && data?.length === expected;
  }
  record("fixtures_have_expected_shape", fixtureShapeValid && fixtures.storage.length === 12);

  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  const managedBuckets = (buckets ?? []).filter((bucket) =>
    ["brand-logos", "catalog-products", "site-galleries", "promotions"].includes(bucket.id),
  );
  record(
    "all_managed_buckets_remain_private",
    !bucketError && managedBuckets.length === 4 && managedBuckets.every((bucket) => bucket.public === false),
  );

  const brandId = entity("brandIds", randomUUID());
  const categoryId = entity("categoryIds", randomUUID());
  const suffix = randomUUID().slice(0, 8);
  const brandSlug = `qa-phase2-brand-${suffix}`;
  const categorySlug = `qa-phase2-category-${suffix}`;
  const { error: brandCreateError } = await editor.client.from("brands").insert({
    active: false,
    display_order: 7,
    id: brandId,
    name: "QA Fase 2 Marca",
    slug: brandSlug,
  });
  const { error: categoryCreateError } = await editor.client.from("categories").insert({
    active: true,
    display_order: 4,
    id: categoryId,
    name: "QA Fase 2 Categoria",
    slug: categorySlug,
  });
  const { data: updatedBrand, error: brandUpdateError } = await editor.client
    .from("brands")
    .update({ active: true, display_order: 2, name: "QA Fase 2 Marca editada" })
    .eq("id", brandId)
    .select("active, display_order, name")
    .single();
  record(
    "brand_crud_create_update_toggle_order",
    !brandCreateError && !brandUpdateError && updatedBrand?.active && updatedBrand.display_order === 2,
  );
  record("category_crud_create", !categoryCreateError);
  const { error: duplicateBrandSlug } = await editor.client.from("brands").insert({
    active: false,
    name: "Duplicada",
    slug: brandSlug,
  });
  const { error: duplicateCategorySlug } = await editor.client.from("categories").insert({
    active: false,
    name: "Duplicada",
    slug: categorySlug,
  });
  record("duplicate_brand_and_category_slugs_are_rejected", duplicateBrandSlug && duplicateCategorySlug);

  const productId = entity("productIds", randomUUID());
  const productSlug = `qa-phase2-product-${suffix}`;
  const sku = `QA-PHASE2-${suffix}`.toUpperCase();
  const { error: productCreateError } = await editor.client.from("products").insert({
    brand_id: brandId,
    category_id: categoryId,
    id: productId,
    model: "Modelo QA",
    name: "QA Fase 2 Produto",
    published: false,
    sku,
    slug: productSlug,
  });
  record("product_crud_create_draft", !productCreateError);
  const { error: duplicateSkuError } = await editor.client.from("products").insert({
    id: randomUUID(),
    name: "SKU duplicado",
    sku: sku.toLowerCase(),
    slug: `qa-phase2-other-${suffix}`,
  });
  const { error: duplicateProductSlug } = await editor.client.from("products").insert({
    id: randomUUID(),
    name: "Slug duplicado",
    sku: `QA-PHASE2-OTHER-${suffix}`,
    slug: productSlug,
  });
  record("duplicate_sku_case_insensitive_and_slug_are_rejected", duplicateSkuError && duplicateProductSlug);

  const { error: linkedCategoryDeleteError } = await editor.client
    .from("categories")
    .delete()
    .eq("id", categoryId);
  record("linked_category_delete_is_rejected", Boolean(linkedCategoryDeleteError));

  const firstUpload = await upload(editor.client, "catalog-products", productId);
  const secondUpload = await upload(editor.client, "catalog-products", productId);
  if (!firstUpload.error) cleanup.storage.push({ bucket: "catalog-products", path: firstUpload.storagePath });
  if (!secondUpload.error) cleanup.storage.push({ bucket: "catalog-products", path: secondUpload.storagePath });
  const firstImageId = entity("imageIds", randomUUID());
  const secondImageId = entity("imageIds", randomUUID());
  const { error: imageInsertError } = await editor.client.from("product_images").insert([
    {
      alt_text: "QA imagem um",
      display_order: 0,
      height: 1,
      id: firstImageId,
      is_cover: true,
      product_id: productId,
      storage_path: firstUpload.storagePath,
      width: 1,
    },
    {
      alt_text: "QA imagem dois",
      display_order: 1,
      height: 1,
      id: secondImageId,
      is_cover: false,
      product_id: productId,
      storage_path: secondUpload.storagePath,
      width: 1,
    },
  ]);
  record("multiple_product_image_upload_and_records", !firstUpload.error && !secondUpload.error && !imageInsertError);
  const { error: reorderImageError } = await editor.client.rpc("reorder_product_images", {
    ordered_ids: [secondImageId, firstImageId],
    target_product_id: productId,
  });
  const { error: coverError } = await editor.client.rpc("set_product_cover", {
    target_image_id: secondImageId,
    target_product_id: productId,
  });
  const { data: reorderedImages } = await editor.client
    .from("product_images")
    .select("id, display_order, is_cover")
    .eq("product_id", productId)
    .order("display_order");
  record(
    "product_images_reorder_and_exactly_one_cover",
    !reorderImageError && !coverError && reorderedImages?.[0]?.id === secondImageId
      && reorderedImages.filter((image) => image.is_cover).length === 1,
  );
  const { error: secondCoverError } = await editor.client
    .from("product_images")
    .update({ is_cover: true })
    .eq("id", firstImageId);
  record("database_rejects_two_product_covers", Boolean(secondCoverError));

  const { data: publishedProduct, error: publishError } = await editor.client
    .from("products")
    .update({ featured: true, published: true })
    .eq("id", productId)
    .select("published")
    .single();
  const { data: anonymousPublished } = await anonymous.from("products").select("id").eq("id", productId);
  record("complete_product_can_be_published", !publishError && publishedProduct?.published && anonymousPublished?.length === 1);

  const { data: archivedProduct, error: archiveError } = await editor.client
    .from("products")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", productId)
    .select("archived_at, featured, published")
    .single();
  const { data: anonymousArchived } = await anonymous.from("products").select("id").eq("id", productId);
  record(
    "archive_unpublishes_and_hides_product",
    !archiveError && archivedProduct?.archived_at && !archivedProduct.featured
      && !archivedProduct.published && anonymousArchived?.length === 0,
  );
  const { error: restoreError } = await editor.client
    .from("products")
    .update({ archived_at: null })
    .eq("id", productId);
  record("archived_product_can_be_restored_as_draft", !restoreError);

  const duplicatedProductId = entity("productIds", randomUUID());
  const { data: duplicatedProduct, error: controlledDuplicateError } = await editor.client
    .from("products")
    .insert({
      availability_status: "consultation",
      brand_id: brandId,
      category_id: categoryId,
      featured: false,
      id: duplicatedProductId,
      name: "QA Fase 2 Produto copia",
      published: false,
      sku: `${sku}-COPY`,
      slug: `${productSlug}-copy`,
    })
    .select("availability_status, featured, published")
    .single();
  record(
    "controlled_product_duplication_stays_draft_without_relations",
    !controlledDuplicateError && duplicatedProduct?.availability_status === "consultation"
      && !duplicatedProduct.featured && !duplicatedProduct.published,
  );

  const { data: availability, error: availabilityError } = await attendant.client
    .from("products")
    .update({ availability_status: "last_unit" })
    .eq("id", productId)
    .select("availability_status")
    .single();
  const { error: attendantDescriptionError } = await attendant.client
    .from("products")
    .update({ short_description: "Alteracao indevida" })
    .eq("id", productId);
  record(
    "attendant_changes_only_availability",
    !availabilityError && availability?.availability_status === "last_unit" && attendantDescriptionError,
  );
  const { error: attendantBrandError } = await attendant.client.from("brands").insert({
    name: "Bloqueada",
    slug: `blocked-${suffix}`,
  });
  const attendantUpload = await upload(attendant.client, "catalog-products", productId);
  record("attendant_cannot_manage_content_or_images", attendantBrandError && attendantUpload.error);

  const invalidMime = await upload(
    editor.client,
    "catalog-products",
    productId,
    Buffer.from("<svg></svg>"),
    "image/svg+xml",
  );
  record("storage_rejects_forbidden_mime", Boolean(invalidMime.error));
  const oversized = await upload(
    editor.client,
    "catalog-products",
    productId,
    new Uint8Array(8 * 1024 * 1024 + 1),
  );
  if (!oversized.error) cleanup.storage.push({ bucket: "catalog-products", path: oversized.storagePath });
  record("storage_rejects_oversized_file", Boolean(oversized.error));
  const missingBucket = await upload(editor.client, "missing-phase2-bucket", productId);
  const { data: orphanAfterStorageFailure } = await editor.client
    .from("product_images")
    .select("id")
    .eq("storage_path", missingBucket.storagePath);
  record(
    "storage_failure_does_not_create_database_orphan",
    Boolean(missingBucket.error) && orphanAfterStorageFailure?.length === 0,
  );
  const compensationUpload = await upload(editor.client, "catalog-products", productId);
  const { error: invalidRecordError } = await editor.client.from("product_images").insert({
    alt_text: "",
    height: 1,
    is_cover: false,
    product_id: productId,
    storage_path: compensationUpload.storagePath,
    width: 1,
  });
  const { error: compensationRemoveError } = await editor.client.storage
    .from("catalog-products")
    .remove([compensationUpload.storagePath]);
  const { error: compensationDownloadError } = await editor.client.storage
    .from("catalog-products")
    .download(compensationUpload.storagePath);
  record(
    "database_failure_can_be_compensated_without_storage_orphan",
    !compensationUpload.error && invalidRecordError && !compensationRemoveError && compensationDownloadError,
  );

  const fixtureImage = fixtures.storage.find((entry) => entry.bucket === "catalog-products");
  const { data: signed, error: signedError } = await editor.client.storage
    .from("catalog-products")
    .createSignedUrl(fixtureImage.path, 60);
  const signedResponse = signed?.signedUrl ? await fetch(signed.signedUrl) : null;
  const { error: anonymousSignError } = await anonymous.storage
    .from("catalog-products")
    .createSignedUrl(fixtureImage.path, 60);
  record(
    "private_image_uses_short_lived_signed_url_for_authorized_reader",
    !signedError && signedResponse?.ok && anonymousSignError,
  );

  const collectionId = entity("collectionIds", randomUUID());
  const collectionUpload = await upload(editor.client, "site-galleries", collectionId);
  if (!collectionUpload.error) cleanup.storage.push({ bucket: "site-galleries", path: collectionUpload.storagePath });
  const { error: collectionCreateError } = await editor.client.from("collections").insert({
    cover_alt_text: "Capa QA",
    cover_height: 1,
    cover_path: collectionUpload.storagePath,
    cover_width: 1,
    description: "Colecao QA",
    id: collectionId,
    name: "QA Fase 2 Colecao",
    published: true,
    slug: `qa-phase2-collection-${suffix}`,
  });
  const collectionProducts = [fixtures.productIds[2], fixtures.productIds[0]];
  const { error: collectionSyncError } = await editor.client.rpc("sync_collection_products", {
    ordered_product_ids: collectionProducts,
    target_collection_id: collectionId,
  });
  collectionProducts.forEach((id) => cleanup.auditEntityIds.push(`${collectionId}:${id}`));
  const { data: collectionRows } = await editor.client
    .from("collection_products")
    .select("product_id, display_order")
    .eq("collection_id", collectionId)
    .order("display_order");
  const { error: invalidCollectionWindow } = await editor.client.from("collections").insert({
    ends_at: new Date(Date.now() - 86_400_000).toISOString(),
    name: "Janela invalida",
    slug: `qa-invalid-collection-${suffix}`,
    starts_at: new Date().toISOString(),
  });
  record(
    "collection_crud_cover_relations_order_and_date_window",
    !collectionUpload.error && !collectionCreateError && !collectionSyncError
      && collectionRows?.map((row) => row.product_id).join() === collectionProducts.join()
      && invalidCollectionWindow,
  );

  const galleryId = entity("galleryIds", randomUUID());
  const { error: galleryCreateError } = await editor.client.from("galleries").insert({
    id: galleryId,
    name: "QA Fase 2 Galeria",
    published: false,
    route_key: `qa-phase2-gallery-${suffix}`,
    slug: `qa-phase2-gallery-${suffix}`,
  });
  const galleryItems = [];
  for (let index = 0; index < 3; index += 1) {
    const uploaded = await upload(editor.client, "site-galleries", galleryId);
    if (!uploaded.error) cleanup.storage.push({ bucket: "site-galleries", path: uploaded.storagePath });
    const id = entity("imageIds", randomUUID());
    const { error } = await editor.client.from("gallery_items").insert({
      alt_text: `Imagem QA ${index + 1}`,
      display_order: index,
      gallery_id: galleryId,
      height: 1,
      id,
      published: true,
      series_order: index < 2 ? index : null,
      storage_path: uploaded.storagePath,
      visual_series: index < 2 ? "qa-serie" : null,
      width: 1,
    });
    galleryItems.push({ error, id });
  }
  const galleryIds = galleryItems.map((item) => item.id);
  const { error: validGalleryOrder } = await editor.client.rpc("reorder_gallery_items", {
    ordered_ids: [galleryIds[2], galleryIds[0], galleryIds[1]],
    target_gallery_id: galleryId,
  });
  const { error: invalidGalleryOrder } = await editor.client.rpc("reorder_gallery_items", {
    ordered_ids: [galleryIds[0], galleryIds[2], galleryIds[1]],
    target_gallery_id: galleryId,
  });
  const { error: galleryPublishError } = await editor.client
    .from("galleries")
    .update({ autoplay: true, published: true })
    .eq("id", galleryId);
  const { error: deleteAllPublishedItems } = await editor.client
    .from("gallery_items")
    .delete()
    .eq("gallery_id", galleryId);
  record(
    "gallery_crud_preserves_visual_series_and_published_image",
    !galleryCreateError && galleryItems.every((item) => !item.error) && !validGalleryOrder
      && invalidGalleryOrder && !galleryPublishError && deleteAllPublishedItems,
  );

  const promotionId = entity("promotionIds", randomUUID());
  const promotionUpload = await upload(editor.client, "promotions", promotionId);
  if (!promotionUpload.error) cleanup.storage.push({ bucket: "promotions", path: promotionUpload.storagePath });
  const start = new Date(Date.now() - 60_000).toISOString();
  const end = new Date(Date.now() + 86_400_000).toISOString();
  const { error: promotionCreateError } = await editor.client.from("promotions").insert({
    active: true,
    cta_label: "Falar no WhatsApp",
    cta_target: "whatsapp",
    ends_at: end,
    featured: true,
    id: promotionId,
    image_alt_text: "Imagem promocional QA",
    image_height: 1,
    image_path: promotionUpload.storagePath,
    image_width: 1,
    priority: 5,
    slug: `qa-phase2-promotion-${suffix}`,
    starts_at: start,
    title: "QA Fase 2 Promocao",
    type: "highlight",
  });
  const promotionProducts = [fixtures.productIds[1], fixtures.productIds[0]];
  const { error: promotionSyncError } = await editor.client.rpc("sync_promotion_products", {
    ordered_product_ids: promotionProducts,
    target_promotion_id: promotionId,
  });
  promotionProducts.forEach((id) => cleanup.auditEntityIds.push(`${promotionId}:${id}`));
  const { data: promotionRows } = await editor.client
    .from("promotion_products")
    .select("product_id, display_order")
    .eq("promotion_id", promotionId)
    .order("display_order");
  const { error: invalidPromotionWindow } = await editor.client.from("promotions").insert({
    cta_label: "CTA",
    ends_at: start,
    image_path: promotionUpload.storagePath,
    slug: `qa-invalid-promotion-${suffix}`,
    starts_at: end,
    title: "Janela invalida",
    type: "promotion",
  });
  record(
    "promotion_crud_relations_priority_and_date_window",
    !promotionUpload.error && !promotionCreateError && !promotionSyncError
      && promotionRows?.map((row) => row.product_id).join() === promotionProducts.join()
      && invalidPromotionWindow,
  );

  const { data: attendantProfiles, error: attendantProfilesError } = await attendant.client
    .from("profiles")
    .select("id");
  const { data: editorProfiles, error: editorProfilesError } = await editor.client
    .from("profiles")
    .select("id");
  const { data: adminProfiles, error: adminProfilesError } = await realAdmin.client
    .from("profiles")
    .select("id")
    .in("id", [editor.id, attendant.id, inactive.id]);
  record(
    "only_admin_lists_authorized_users",
    !attendantProfilesError && attendantProfiles?.length === 1
      && !editorProfilesError && editorProfiles?.length === 1
      && !adminProfilesError && adminProfiles?.length === 3,
  );
  const { data: editorRoleAttempt, error: editorRoleError } = await editor.client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", attendant.id)
    .select("id");
  record("editor_cannot_change_user_roles", editorRoleError || editorRoleAttempt?.length === 0);
  const { data: changedRole, error: adminRoleChangeError } = await realAdmin.client
    .from("profiles")
    .update({ role: "attendant" })
    .eq("id", editor.id)
    .select("role")
    .single();
  const { error: roleRestoreError } = await realAdmin.client
    .from("profiles")
    .update({ role: "editor" })
    .eq("id", editor.id);
  record("admin_can_change_other_user_role", !adminRoleChangeError && changedRole?.role === "attendant" && !roleRestoreError);

  const { data: inactiveProducts, error: inactiveReadError } = await inactive.client
    .from("products")
    .select("id")
    .in("id", fixtures.productIds);
  const { data: anonymousFixtureProducts, error: anonymousReadError } = await anonymous
    .from("products")
    .select("id")
    .in("id", fixtures.productIds);
  record("inactive_user_has_no_admin_read", !inactiveReadError && inactiveProducts?.length === 0);
  record("anonymous_reads_only_published_fixture_products", !anonymousReadError && anonymousFixtureProducts?.length === 3);
  const { error: anonymousWriteError } = await anonymous.from("categories").insert({
    name: "Anonima",
    slug: `anon-${suffix}`,
  });
  record("anonymous_cannot_mutate_admin_content", Boolean(anonymousWriteError));

  const settingKey = `qa.phase2.${suffix}`;
  cleanup.settingKeys.push(settingKey);
  cleanup.auditEntityIds.push(settingKey);
  const { error: settingError } = await realAdmin.client.from("site_settings").insert({
    key: settingKey,
    value: { api_key: "DUMMY-QA-VALUE", safe: "visible" },
  });
  const { data: auditRows, error: auditError } = await realAdmin.client
    .from("audit_logs")
    .select("actor_id, new_data")
    .eq("entity_type", "products")
    .eq("entity_id", productId)
    .eq("actor_id", attendant.id)
    .limit(1);
  const { data: redactedRows, error: redactedError } = await realAdmin.client
    .from("audit_logs")
    .select("new_data")
    .eq("entity_type", "site_settings")
    .eq("entity_id", settingKey)
    .limit(1);
  const redactedText = JSON.stringify(redactedRows?.[0]?.new_data ?? {});
  record(
    "audit_records_actor_entity_and_masks_sensitive_fields",
    !settingError && !auditError && auditRows?.length === 1 && !redactedError
      && redactedRows?.length === 1 && !redactedText.includes("DUMMY-QA-VALUE")
      && redactedText.includes("visible"),
  );
  const { data: editorAudit, error: editorAuditError } = await editor.client
    .from("audit_logs")
    .select("id")
    .limit(1);
  const { data: attendantAudit, error: attendantAuditError } = await attendant.client
    .from("audit_logs")
    .select("id")
    .limit(1);
  record(
    "audit_interface_data_is_admin_only",
    !editorAuditError && editorAudit?.length === 0 && !attendantAuditError && attendantAudit?.length === 0,
  );

  const expiredSlug = `expired-${suffix}`;
  await editor.client.auth.signOut();
  const { error: expiredMutationError } = await editor.client.from("brands").insert({
    name: "Sessao expirada",
    slug: expiredSlug,
  });
  record("expired_session_cannot_mutate", Boolean(expiredMutationError));

  const { data: activeAdmins, error: activeAdminsError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("active", true);
  record(
    "real_active_admin_remains_present_after_role_tests",
    !activeAdminsError && activeAdmins?.some((profile) => profile.id === realAdmin.id),
  );

  await realAdmin.client.auth.signOut();
  await attendant.client.auth.signOut();
  await inactive.client.auth.signOut();
} catch {
  fatalError = true;
  record("qa_phase2_completed_without_unexpected_error", false);
} finally {
  await cleanupQa();
}

const passed = results.filter((result) => result.passed).length;
const report = { passed, total: results.length, tests: results };
console.log(JSON.stringify(report, null, 2));
if (fatalError || passed !== results.length) process.exitCode = 1;
