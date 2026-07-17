import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = required("SUPABASE_SECRET_KEY");
const baseUrl = (process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:3013").replace(/\/$/, "");
const fixtureStatePath = path.resolve(".tmp/admin-qa/phase2-fixtures.json");
if (!fs.existsSync(fixtureStatePath)) throw new Error("Fixtures efemeras precisam estar ativas.");
const fixtures = JSON.parse(fs.readFileSync(fixtureStatePath, "utf8"));
if (!fixtures.phase3?.prepared) throw new Error("Fixtures da Fase 3 precisam ser preparadas.");

const client = (key = publishableKey) => createClient(url, key, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});
const admin = client(secretKey);
const anonymous = client();
const results = [];
const cleanup = {
  analyticsSessions: [],
  auditEntityIds: [],
  brandIds: [],
  productIds: [],
  storagePaths: [],
};
let restoredImage = null;

function record(name, passed) {
  results.push({ name, passed: Boolean(passed) });
}

async function page(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { "User-Agent": "Vision-Phase3-QA" },
    redirect: "manual",
  });
  return { html: await response.text(), response };
}

function productLinks(html) {
  const $ = cheerio.load(html);
  return [...new Set(
    $("a[href]").map((_, element) => $(element).attr("href") || "").get()
      .filter((href) => /^\/catalogo\/[a-z0-9-]+$/.test(href)),
  )];
}

async function postEvent(payload, sessionId, route = "/qa-phase3") {
  return fetch(`${baseUrl}/api/analytics`, {
    body: JSON.stringify({
      anonymousSessionId: sessionId,
      collectionId: null,
      metadata: {},
      productId: null,
      promotionId: null,
      route,
      ...payload,
    }),
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      "User-Agent": "Vision-Phase3-QA",
    },
    method: "POST",
  });
}

async function cleanupQa() {
  if (restoredImage) {
    await admin.from("product_images").update({ storage_path: restoredImage.originalPath }).eq("id", restoredImage.id);
  }
  for (const sessionId of cleanup.analyticsSessions) {
    await admin.from("analytics_events").delete().eq("anonymous_session_id", sessionId);
  }
  for (const productId of cleanup.productIds) {
    await admin.from("products").delete().eq("id", productId);
  }
  for (const brandId of cleanup.brandIds) {
    await admin.from("brands").delete().eq("id", brandId);
  }
  if (cleanup.storagePaths.length) {
    await admin.storage.from("catalog-products").remove(cleanup.storagePaths);
  }
  if (cleanup.auditEntityIds.length) {
    await admin.from("audit_logs").delete().in("entity_id", [...new Set(cleanup.auditEntityIds)]);
  }
}

let fatalError = false;
try {
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, sku, slug, name, brand_id, category_id, availability_status, price, price_visibility, brand:brands(name, slug), category:categories(name, slug), images:product_images(id, storage_path, is_cover, updated_at)")
    .in("id", fixtures.productIds)
    .order("display_order");
  if (productsError || products?.length !== 5) throw new Error("Produtos da fixture indisponiveis.");
  const first = products[0];
  const visiblePriceProduct = products.find((product) => product.price_visibility === "visible");
  if (!first || !visiblePriceProduct || !first.brand || !first.category) throw new Error("Fixture publica incompleta.");

  const filterOptions = await anonymous.rpc("catalog_filter_options");
  record("public_filter_options_only_include_nonempty_values", !filterOptions.error && filterOptions.data.length >= 7 && filterOptions.data.every((item) => item.product_count > 0));

  const catalogSearch = await anonymous.rpc("search_catalog_products", { p_page_offset: 0, p_page_size: 24 });
  record("anonymous_catalog_returns_five_published_fixtures", !catalogSearch.error && catalogSearch.data.length === 5 && catalogSearch.data.every((item) => fixtures.productIds.includes(item.product_id)));
  const accentSearch = await anonymous.rpc("search_catalog_products", { p_page_offset: 0, p_page_size: 24, p_search_term: "oculos aureo" });
  record("search_is_case_and_accent_insensitive", !accentSearch.error && accentSearch.data.length === 1 && accentSearch.data[0].product_id === first.id);
  const brandSearch = await anonymous.rpc("search_catalog_products", { p_brand_slug: first.brand.slug, p_page_offset: 0, p_page_size: 24 });
  record("brand_filter_returns_only_selected_brand", !brandSearch.error && brandSearch.data.length > 0 && brandSearch.data.every((item) => item.brand_slug === first.brand.slug));
  const categorySearch = await anonymous.rpc("search_catalog_products", { p_category_slug: first.category.slug, p_page_offset: 0, p_page_size: 24 });
  record("category_filter_returns_only_selected_category", !categorySearch.error && categorySearch.data.length > 0 && categorySearch.data.every((item) => item.category_slug === first.category.slug));
  const availabilitySearch = await anonymous.rpc("search_catalog_products", { p_availability: first.availability_status, p_page_offset: 0, p_page_size: 24 });
  record("availability_filter_returns_only_selected_state", !availabilitySearch.error && availabilitySearch.data.length > 0 && availabilitySearch.data.every((item) => item.availability_status === first.availability_status));
  const combinedSearch = await anonymous.rpc("search_catalog_products", {
    p_availability: first.availability_status,
    p_brand_slug: first.brand.slug,
    p_category_slug: first.category.slug,
    p_page_offset: 0,
    p_page_size: 24,
    p_search_term: "aureo",
  });
  record("combined_filters_are_applied_server_side", !combinedSearch.error && combinedSearch.data.length === 1 && combinedSearch.data[0].product_id === first.id);

  const draftId = randomUUID();
  const draftSlug = `fixture-phase3-draft-${draftId.slice(0, 8)}`;
  const draftPath = `${draftId}/${randomUUID()}.png`;
  cleanup.productIds.push(draftId);
  cleanup.auditEntityIds.push(draftId);
  cleanup.storagePaths.push(draftPath);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const { error: draftError } = await admin.from("products").insert({
    brand_id: first.brand_id,
    category_id: first.category_id,
    id: draftId,
    name: "[FIXTURE FASE 3] Rascunho invisivel",
    price_visibility: "hidden",
    published: false,
    sku: `DRAFT-${draftId}`,
    slug: draftSlug,
  });
  const { error: draftUploadError } = await admin.storage.from("catalog-products").upload(draftPath, png, { contentType: "image/png" });
  const draftImageId = randomUUID();
  cleanup.auditEntityIds.push(draftImageId);
  const { error: draftImageError } = await admin.from("product_images").insert({
    alt_text: "[FIXTURE FASE 3] Imagem de rascunho",
    height: 1,
    id: draftImageId,
    is_cover: true,
    product_id: draftId,
    storage_path: draftPath,
    width: 1,
  });
  if (draftError || draftUploadError || draftImageError) throw new Error("Falha ao preparar rascunho de QA.");

  const { data: anonymousRows, error: anonymousError } = await anonymous
    .from("products")
    .select("id")
    .in("id", [...fixtures.productIds, draftId]);
  record("rls_hides_unpublished_products", !anonymousError && anonymousRows.length === 5 && !anonymousRows.some((row) => row.id === draftId));
  const directStorage = await anonymous.storage.from("catalog-products").download(first.images.find((image) => image.is_cover).storage_path);
  record("private_bucket_rejects_direct_anonymous_download", Boolean(directStorage.error));

  const catalogPage = await page("/catalogo");
  record("catalog_page_renders_published_products", catalogPage.response.status === 200 && productLinks(catalogPage.html).length === 5);
  const searchPage = await page("/catalogo?busca=oculos%20aureo");
  record("search_url_is_shareable_and_keeps_result", searchPage.response.status === 200 && productLinks(searchPage.html).some((href) => href.endsWith(first.slug)) && searchPage.html.includes("value=\"oculos aureo\""));
  const brandPage = await page(`/catalogo?marca=${first.brand.slug}`);
  const brandProductIds = new Set(brandSearch.data.map((row) => row.slug));
  record("brand_url_shows_continuous_selected_composition", brandPage.response.status === 200 && productLinks(brandPage.html).every((href) => brandProductIds.has(href.split("/").pop())));
  const emptyFilterPage = await page("/catalogo?marca=marca-inexistente");
  record("empty_filter_keeps_controls_and_clear_action", emptyFilterPage.response.status === 200 && emptyFilterPage.html.includes("Nenhum resultado") && emptyFilterPage.html.includes("Limpar"));

  const homePage = await page("/");
  const home$ = cheerio.load(homePage.html);
  const preview = home$("section[aria-labelledby='catalog-preview-title']");
  const semanticPreviewLinks = preview.find("a[href^='/catalogo/']").filter((_, element) => home$(element).closest("[aria-hidden='true']").length === 0).map((_, element) => home$(element).attr("href")).get();
  record("home_preview_has_five_unique_semantic_products", homePage.response.status === 200 && new Set(semanticPreviewLinks).size === 5 && semanticPreviewLinks.length === 5);
  record("home_preview_clones_are_aria_hidden", preview.find("[aria-hidden='true'] a[tabindex='-1']").length === 5);

  const productPage = await page(`/catalogo/${first.slug}`);
  const product$ = cheerio.load(productPage.html);
  const jsonLdText = product$("script[type='application/ld+json']").first().text();
  const jsonLd = JSON.parse(jsonLdText);
  record("published_product_page_has_real_fields", productPage.response.status === 200 && productPage.html.includes(first.name) && productPage.html.includes(first.sku) && productPage.html.includes(first.brand.name));
  record("product_json_ld_omits_false_commercial_data", jsonLd["@type"] === "Product" && !jsonLd.aggregateRating && !jsonLd.review && !jsonLd.offers && !JSON.stringify(jsonLd).includes("availability"));
  const visiblePage = await page(`/catalogo/${visiblePriceProduct.slug}`);
  const visible$ = cheerio.load(visiblePage.html);
  const visibleJsonLd = JSON.parse(visible$("script[type='application/ld+json']").first().text());
  record("visible_price_creates_offer_without_inventory_claim", visibleJsonLd.offers?.price === Number(visiblePriceProduct.price).toFixed(2) && !visibleJsonLd.offers?.availability);
  const whatsappHref = product$("a[href*='api.whatsapp.com/send']").filter((_, element) => product$(element).text().includes("Consultar")).first().attr("href");
  const whatsappText = whatsappHref ? new URL(whatsappHref).searchParams.get("text") || "" : "";
  record("whatsapp_message_identifies_exact_product", Boolean(whatsappHref) && whatsappText.includes(first.name) && whatsappText.includes(`Código: ${first.sku}`) && whatsappText.includes(`Marca: ${first.brand.name}`) && whatsappText.includes("Gostaria de confirmar a disponibilidade.") && whatsappText.includes(`/catalogo/${first.slug}`));

  const sitemap = await page("/sitemap.xml");
  record("sitemap_contains_only_published_fixture_products", sitemap.response.status === 200 && products.every((product) => sitemap.html.includes(`/catalogo/${product.slug}`)) && !sitemap.html.includes(draftSlug));

  const cover = first.images.find((image) => image.is_cover);
  const imageResponse = await fetch(`${baseUrl}/api/catalogo/imagem/${cover.id}?v=${encodeURIComponent(cover.updated_at)}`);
  record("published_image_proxy_validates_and_caches_version", imageResponse.status === 200 && imageResponse.headers.get("content-type")?.startsWith("image/") && imageResponse.headers.get("cache-control")?.includes("immutable") && imageResponse.headers.get("x-content-type-options") === "nosniff");
  const draftImageResponse = await fetch(`${baseUrl}/api/catalogo/imagem/${draftImageId}`);
  const arbitraryImageResponse = await fetch(`${baseUrl}/api/catalogo/imagem/${randomUUID()}`);
  record("image_proxy_rejects_draft_and_arbitrary_ids", draftImageResponse.status === 404 && arbitraryImageResponse.status === 404);

  const secondImage = first.images.find((image) => !image.is_cover);
  if (!secondImage) throw new Error("Segunda imagem de fixture ausente.");
  const missingPath = `${first.id}/${randomUUID()}.jpg`;
  const { error: missingPathError } = await admin.from("product_images").update({ storage_path: missingPath }).eq("id", secondImage.id);
  if (missingPathError) throw new Error("Falha ao preparar indisponibilidade de Storage.");
  restoredImage = { id: secondImage.id, originalPath: secondImage.storage_path };
  const fallbackResponse = await fetch(`${baseUrl}/api/catalogo/imagem/${secondImage.id}?v=missing`);
  record("storage_failure_returns_controlled_nonwhite_fallback", fallbackResponse.status === 200 && fallbackResponse.headers.get("x-catalog-image-fallback") === "1" && fallbackResponse.headers.get("content-type") === "image/png");
  await admin.from("product_images").update({ storage_path: secondImage.storage_path }).eq("id", secondImage.id);
  restoredImage = null;

  const taxonomyUpdate = await admin.from("brands").update({ active: false }).eq("id", first.brand_id);
  record("published_brand_cannot_be_disabled_silently", Boolean(taxonomyUpdate.error));
  const secondCover = await admin.from("product_images").insert({
    alt_text: "[FIXTURE FASE 3] Segunda capa bloqueada",
    height: 1,
    is_cover: true,
    product_id: first.id,
    storage_path: `${first.id}/${randomUUID()}.png`,
    width: 1,
  });
  record("database_preserves_exactly_one_cover", Boolean(secondCover.error));

  const inactiveBrandId = randomUUID();
  const inactiveProductId = randomUUID();
  const inactivePath = `${inactiveProductId}/${randomUUID()}.png`;
  cleanup.brandIds.push(inactiveBrandId);
  cleanup.productIds.push(inactiveProductId);
  cleanup.storagePaths.push(inactivePath);
  cleanup.auditEntityIds.push(inactiveBrandId, inactiveProductId);
  await admin.from("brands").insert({ active: false, id: inactiveBrandId, name: "[FIXTURE FASE 3] Marca inativa", slug: `fixture-phase3-inactive-${inactiveBrandId.slice(0, 8)}` });
  await admin.from("products").insert({ brand_id: inactiveBrandId, id: inactiveProductId, name: "[FIXTURE FASE 3] Produto bloqueado", sku: `INACTIVE-${inactiveProductId}`, slug: `fixture-phase3-inactive-product-${inactiveProductId.slice(0, 8)}` });
  await admin.storage.from("catalog-products").upload(inactivePath, png, { contentType: "image/png" });
  const inactiveImageId = randomUUID();
  cleanup.auditEntityIds.push(inactiveImageId);
  await admin.from("product_images").insert({ alt_text: "[FIXTURE FASE 3] Capa bloqueada", height: 1, id: inactiveImageId, is_cover: true, product_id: inactiveProductId, storage_path: inactivePath, width: 1 });
  const inactivePublish = await admin.from("products").update({ published: true }).eq("id", inactiveProductId);
  record("publication_rejects_inactive_linked_brand", Boolean(inactivePublish.error));

  const eventSession = randomUUID();
  cleanup.analyticsSessions.push(eventSession);
  const viewEvent = await postEvent({ eventName: "product_view", productId: first.id }, eventSession, `/catalogo/${first.slug}`);
  const clickEvent = await postEvent({ eventName: "product_whatsapp_click", metadata: { surface: "qa" }, productId: first.id }, eventSession, `/catalogo/${first.slug}`);
  const searchEvent = await postEvent({ eventName: "catalog_search", metadata: { query: "oculos aureo" } }, eventSession, "/catalogo");
  record("public_analytics_accepts_only_relevant_catalog_events", viewEvent.status === 202 && clickEvent.status === 202 && searchEvent.status === 202);
  const { data: eventRows, error: eventRowsError } = await admin.from("analytics_events").select("event_name, metadata").eq("anonymous_session_id", eventSession);
  record("analytics_stores_no_ip_email_or_message", !eventRowsError && eventRows.length === 3 && !JSON.stringify(eventRows).match(/@|x-forwarded|user-agent|phone|message/i));
  const adminActor = client();
  const login = await adminActor.auth.signInWithPassword({ email: required("QA_ADMIN_EMAIL"), password: required("QA_ADMIN_PASSWORD") });
  const adminReport = login.error ? null : await adminActor.rpc("admin_catalog_analytics", { p_days: 7 });
  const anonymousReport = await anonymous.rpc("admin_catalog_analytics", { p_days: 7 });
  record("analytics_report_is_admin_only_and_contains_product_metrics", !login.error && !adminReport?.error && JSON.stringify(adminReport?.data).includes(first.name) && Boolean(anonymousReport.error));
  await adminActor.auth.signOut();

  if (process.env.QA_TEST_RATE_LIMIT === "1") {
    const rateSession = randomUUID();
    cleanup.analyticsSessions.push(rateSession);
    const statuses = [];
    for (let index = 0; index < 46; index += 1) {
      const response = await postEvent({ eventName: "page_view", metadata: { test: true } }, rateSession, "/qa-phase3-rate");
      statuses.push(response.status);
    }
    record("distributed_rate_limit_caps_one_fingerprint", statuses.slice(0, 45).every((status) => status === 202) && statuses[45] === 429);
  }

  record("client_html_contains_no_server_secret", !catalogPage.html.includes(secretKey) && !productPage.html.includes(secretKey) && !homePage.html.includes(secretKey));
} catch {
  fatalError = true;
  record("qa_phase3_completed_without_unexpected_error", false);
} finally {
  await cleanupQa();
}

const passed = results.filter((result) => result.passed).length;
console.log(JSON.stringify({ passed, tests: results, total: results.length }, null, 2));
if (fatalError || passed !== results.length) process.exitCode = 1;
