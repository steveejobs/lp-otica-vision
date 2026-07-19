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
const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const results = [];
const cleanup = {
  auditEntityIds: [],
  brandIds: [],
  categoryIds: [],
  productIds: [],
  storagePaths: [],
  userIds: [],
};

function record(name, passed) {
  results.push({ name, passed: Boolean(passed) });
}

function publicClient() {
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function createQaUser(role, active) {
  const password = `${randomBytes(20).toString("base64url")}aA1!`;
  const email = `qa-${randomUUID()}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  if (error || !data.user) throw new Error("Falha ao criar usuario temporario de QA.");
  cleanup.userIds.push(data.user.id);
  cleanup.auditEntityIds.push(data.user.id);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ active, role })
    .eq("id", data.user.id);
  if (profileError) throw new Error("Falha ao preparar papel temporario de QA.");

  const client = publicClient();
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error("Falha ao autenticar usuario temporario de QA.");
  return { client, id: data.user.id };
}

async function cleanupQa() {
  for (const path of cleanup.storagePaths) {
    await admin.storage.from("catalog-products").remove([path]);
  }
  if (cleanup.productIds.length) {
    await admin.from("products").delete().in("id", cleanup.productIds);
  }
  if (cleanup.brandIds.length) {
    await admin.from("brands").delete().in("id", cleanup.brandIds);
  }
  if (cleanup.categoryIds.length) {
    await admin.from("categories").delete().in("id", cleanup.categoryIds);
  }
  for (const userId of cleanup.userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
  if (cleanup.auditEntityIds.length) {
    await admin.from("audit_logs").delete().in("entity_id", cleanup.auditEntityIds);
  }
}

try {
  const editor = await createQaUser("editor", true);
  const attendant = await createQaUser("attendant", true);
  const inactive = await createQaUser("editor", false);

  const brandId = randomUUID();
  const categoryId = randomUUID();
  cleanup.brandIds.push(brandId);
  cleanup.categoryIds.push(categoryId);
  cleanup.auditEntityIds.push(brandId, categoryId);

  const { error: brandError } = await editor.client.from("brands").insert({
    id: brandId,
    name: "QA Brand",
    slug: `qa-brand-${brandId.slice(0, 8)}`,
  });
  const { error: categoryError } = await editor.client.from("categories").insert({
    id: categoryId,
    name: "QA Category",
    slug: `qa-category-${categoryId.slice(0, 8)}`,
  });
  record("editor_manage_content", !brandError && !categoryError);

  const publishedId = randomUUID();
  const draftId = randomUUID();
  cleanup.productIds.push(publishedId, draftId);
  cleanup.auditEntityIds.push(publishedId, draftId);
  const { error: publishedError } = await editor.client.from("products").insert({
    brand_id: brandId,
    category_id: categoryId,
    id: publishedId,
    name: "QA Published",
    published: false,
    sku: `QA-${publishedId.slice(0, 8)}`,
    slug: `qa-published-${publishedId.slice(0, 8)}`,
  });
  const { error: draftError } = await editor.client.from("products").insert({
    brand_id: brandId,
    category_id: categoryId,
    id: draftId,
    name: "QA Draft",
    published: false,
    sku: `QA-${draftId.slice(0, 8)}`,
    slug: `qa-draft-${draftId.slice(0, 8)}`,
  });
  record("editor_create_products", !publishedError && !draftError);

  const imagePath = `${publishedId}/${randomUUID()}.png`;
  const assetVersion = randomUUID();
  cleanup.storagePaths.push(imagePath);
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const { error: uploadError } = await editor.client.storage
    .from("catalog-products")
    .upload(imagePath, png, { contentType: "image/png", upsert: false });
  const { error: imageRecordError } = await editor.client.from("product_images").insert({
    alt_text: "Imagem de QA da Fase 1",
    asset_version: assetVersion,
    blur_data_url: "data:image/webp;base64,AAAA",
    height: 1,
    is_cover: true,
    mime_type: "image/png",
    product_id: publishedId,
    size_bytes: png.byteLength,
    storage_path: imagePath,
    width: 1,
  });
  const { data: imageRecord } = await editor.client
    .from("product_images")
    .select("id")
    .eq("product_id", publishedId)
    .eq("asset_version", assetVersion)
    .maybeSingle();
  const variantKinds = ["admin_thumbnail", "catalog_card", "home_preview", "product_detail", "open_graph"];
  const { error: variantsError } = imageRecord
    ? await editor.client.from("product_image_variants").insert(
      variantKinds.map((kind) => ({
        asset_version: assetVersion,
        etag: `"${"a".repeat(43)}"`,
        height: 1,
        kind,
        mime_type: kind === "open_graph" ? "image/jpeg" : "image/webp",
        product_image_id: imageRecord.id,
        size_bytes: 1,
        storage_path: `${publishedId}/${randomUUID()}.${kind === "open_graph" ? "jpg" : "webp"}`,
        width: 1,
      })),
    )
    : { error: new Error("Imagem de QA nao foi registrada.") };
  const { error: publishError } = await editor.client
    .from("products")
    .update({ published: true })
    .eq("id", publishedId);
  record(
    "editor_uploads_allowed_image",
    !uploadError && !imageRecordError && !variantsError && !publishError,
  );

  const anonymous = publicClient();
  const { data: publicRows, error: publicReadError } = await anonymous
    .from("products")
    .select("id")
    .in("id", [publishedId, draftId]);
  record(
    "anonymous_reads_only_published_product",
    !publicReadError && publicRows?.length === 1 && publicRows[0].id === publishedId,
  );

  const { error: anonymousInsertError } = await anonymous.from("brands").insert({
    name: "Blocked",
    slug: `blocked-${randomUUID().slice(0, 8)}`,
  });
  record("anonymous_cannot_insert_content", Boolean(anonymousInsertError));

  const { data: attendantRows, error: attendantReadError } = await attendant.client
    .from("products")
    .select("id")
    .in("id", [publishedId, draftId]);
  record("attendant_reads_admin_content", !attendantReadError && attendantRows?.length === 2);

  const { data: availabilityRows, error: availabilityError } = await attendant.client
    .from("products")
    .update({ availability_status: "unavailable" })
    .eq("id", publishedId)
    .select("id, availability_status");
  record(
    "attendant_changes_only_availability",
    !availabilityError && availabilityRows?.[0]?.availability_status === "unavailable",
  );

  const { error: attendantDescriptionError } = await attendant.client
    .from("products")
    .update({ short_description: "Blocked change" })
    .eq("id", publishedId);
  record("attendant_cannot_change_description", Boolean(attendantDescriptionError));

  const { data: roleRows, error: roleError } = await editor.client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", attendant.id)
    .select("id");
  record("editor_cannot_change_roles", Boolean(roleError) || roleRows?.length === 0);

  const { data: inactiveRows, error: inactiveError } = await inactive.client
    .from("products")
    .select("id")
    .in("id", [publishedId, draftId]);
  record("inactive_user_loses_admin_read", !inactiveError && inactiveRows?.length === 0);

  const { error: forbiddenMimeError } = await editor.client.storage
    .from("catalog-products")
    .upload(`${publishedId}/${randomUUID()}.svg`, Buffer.from("<svg></svg>"), {
      contentType: "image/svg+xml",
      upsert: false,
    });
  record("storage_rejects_forbidden_mime", Boolean(forbiddenMimeError));

  const { error: attendantUploadError } = await attendant.client.storage
    .from("catalog-products")
    .upload(`${publishedId}/${randomUUID()}.png`, png, {
      contentType: "image/png",
      upsert: false,
    });
  record("storage_rejects_attendant_upload", Boolean(attendantUploadError));

  const { error: anonymousDownloadError } = await anonymous.storage
    .from("catalog-products")
    .download(imagePath);
  record("private_storage_rejects_anonymous_read", Boolean(anonymousDownloadError));

  const { data: auditRows, error: auditReadError } = await admin
    .from("audit_logs")
    .select("id")
    .eq("entity_id", publishedId)
    .limit(1);
  record("audit_trigger_records_mutation", !auditReadError && Boolean(auditRows?.length));

  const auditId = auditRows?.[0]?.id;
  if (auditId) {
    const { data: deletedAudit, error: deleteAuditError } = await editor.client
      .from("audit_logs")
      .delete()
      .eq("id", auditId)
      .select("id");
    record("editor_cannot_delete_audit_logs", Boolean(deleteAuditError) || deletedAudit?.length === 0);
  } else {
    record("editor_cannot_delete_audit_logs", false);
  }
} finally {
  await cleanupQa();
}

const passed = results.filter((result) => result.passed).length;
const report = { passed, total: results.length, tests: results };
console.log(JSON.stringify(report, null, 2));

if (passed !== results.length) {
  process.exitCode = 1;
}
