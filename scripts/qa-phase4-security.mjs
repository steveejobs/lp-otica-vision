import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

function client(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const admin = client(url, required("SUPABASE_SECRET_KEY"));
const anonymous = client(url, publishableKey);
const suffix = randomUUID().slice(0, 8);
const productId = randomUUID();
const stagingId = randomUUID();
const stagingPath = `${productId}/${randomUUID()}.png`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const password = `${randomBytes(24).toString("base64url")}aA1!`;
const results = [];
const state = { attendantId: null, editorId: null };

function record(name, passed, details = undefined) {
  results.push({ name, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
}

async function createStaff(role) {
  const created = await admin.auth.admin.createUser({
    email: `qa-phase4-${role}-${randomUUID()}@example.invalid`,
    email_confirm: true,
    password,
    user_metadata: { name: `QA Fase 4 ${role}` },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error(`Falha ao criar ${role}.`);
  const id = created.data.user.id;
  const { error } = await admin.from("profiles").update({ active: true, role }).eq("id", id);
  if (error) throw error;
  const signedIn = client(url, publishableKey);
  const login = await signedIn.auth.signInWithPassword({ email: created.data.user.email, password });
  if (login.error) throw login.error;
  return { client: signedIn, id };
}

let fatalError = null;
try {
  const editor = await createStaff("editor");
  state.editorId = editor.id;
  const attendant = await createStaff("attendant");
  state.attendantId = attendant.id;

  const { error: productError } = await admin.from("products").insert({
    availability_status: "consultation",
    id: productId,
    name: `[QA FASE 4] Segurança ${suffix}`,
    published: false,
    sku: `QA-SEC-${suffix}`.toUpperCase(),
    slug: `qa-phase4-seguranca-${suffix}`,
  });
  if (productError) throw productError;

  const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
  const managedBuckets = (buckets ?? []).filter((bucket) =>
    ["brand-logos", "catalog-products", "site-galleries", "promotions"].includes(bucket.id)
  );
  record(
    "all_managed_buckets_remain_private_with_eight_megabyte_limit",
    !bucketError && managedBuckets.length === 4 &&
      managedBuckets.every((bucket) => bucket.public === false && bucket.file_size_limit === 8 * 1024 * 1024),
  );

  const { error: stageError } = await editor.client.from("product_image_uploads").insert({
    id: stagingId,
    mime_type: "image/png",
    product_id: productId,
    size_bytes: png.byteLength,
    storage_path: stagingPath,
  });
  const signed = await editor.client.storage.from("catalog-products").createSignedUploadUrl(stagingPath, { upsert: false });
  const signedUpload = signed.data
    ? await anonymous.storage.from("catalog-products").uploadToSignedUrl(stagingPath, signed.data.token, png, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: false,
      })
    : { error: signed.error };
  record(
    "editor_can_stage_direct_private_upload_with_controlled_signed_token",
    !stageError && !signed.error && !signedUpload.error,
  );

  const attendantStage = await attendant.client.from("product_image_uploads").insert({
    mime_type: "image/png",
    product_id: productId,
    size_bytes: png.byteLength,
    storage_path: `${productId}/${randomUUID()}.png`,
  });
  const attendantSigned = await attendant.client.storage
    .from("catalog-products")
    .createSignedUploadUrl(`${productId}/${randomUUID()}.png`, { upsert: false });
  record(
    "attendant_cannot_stage_or_sign_product_image_uploads",
    Boolean(attendantStage.error) && Boolean(attendantSigned.error),
  );

  const availabilityUpdate = await attendant.client
    .from("products")
    .update({ availability_status: "last_unit" })
    .eq("id", productId)
    .select("availability_status")
    .single();
  const forbiddenContentUpdate = await attendant.client
    .from("products")
    .update({ name: "Alteracao indevida" })
    .eq("id", productId)
    .select("id");
  record(
    "attendant_changes_only_availability",
    !availabilityUpdate.error && availabilityUpdate.data?.availability_status === "last_unit" &&
      (Boolean(forbiddenContentUpdate.error) || forbiddenContentUpdate.data?.length === 0),
  );

  const editorProfiles = await editor.client.from("profiles").select("id");
  const editorRoleAttempt = await editor.client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", attendant.id)
    .select("id");
  record(
    "editor_cannot_list_or_manage_other_users",
    !editorProfiles.error && editorProfiles.data?.length === 1 && editorProfiles.data[0].id === editor.id &&
      (Boolean(editorRoleAttempt.error) || editorRoleAttempt.data?.length === 0),
  );

  const anonymousDownload = await anonymous.storage.from("catalog-products").download(stagingPath);
  const anonymousDraft = await anonymous.from("products").select("id").eq("id", productId);
  record(
    "anonymous_user_cannot_download_private_object_or_read_draft",
    Boolean(anonymousDownload.error) && !anonymousDraft.error && anonymousDraft.data?.length === 0,
  );

  await editor.client.auth.signOut();
  await attendant.client.auth.signOut();
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error);
  record("phase4_security_completed_without_unexpected_error", false, fatalError);
} finally {
  await admin.storage.from("catalog-products").remove([stagingPath]);
  await admin.from("product_image_uploads").delete().eq("id", stagingId);
  await admin.from("products").update({ featured: false, published: false }).eq("id", productId);
  await admin.from("products").delete().eq("id", productId);
  for (const id of [state.editorId, state.attendantId].filter(Boolean)) {
    await admin.auth.admin.deleteUser(id);
  }
  await admin.from("audit_logs").delete().in("entity_id", [productId, state.editorId, state.attendantId].filter(Boolean));
}

const { count: activeAdmins } = await admin
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("active", true)
  .eq("role", "admin");
const { count: stagedUploads } = await admin
  .from("product_image_uploads")
  .select("id", { count: "exact", head: true });
record(
  "security_cleanup_restores_one_admin_and_zero_staged_uploads",
  activeAdmins === 1 && stagedUploads === 0,
  { activeAdmins, stagedUploads },
);

const report = {
  failed: results.filter((result) => !result.passed).length,
  fatalError,
  passed: results.filter((result) => result.passed).length,
  results,
  total: results.length,
};
const reportDir = path.resolve("docs/qa/phase4");
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "phase4-security-results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (fatalError || report.failed) process.exitCode = 1;
