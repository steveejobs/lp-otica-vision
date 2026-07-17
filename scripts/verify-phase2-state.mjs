import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}.`);
  return value;
}

const admin = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SECRET_KEY"),
  { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
);
const authorizedEmail = required("QA_ADMIN_EMAIL").toLowerCase();
const { data: authData, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authError) throw new Error("Falha ao validar identidades autorizadas.");
const matches = authData.users.filter((user) => user.email?.toLowerCase() === authorizedEmail);
const authorizedUser = matches[0];
const { data: profiles, error: profileError } = authorizedUser
  ? await admin.from("profiles").select("id, role, active").eq("id", authorizedUser.id)
  : { data: [], error: null };
if (profileError) throw new Error("Falha ao validar o profile autorizado.");

const fixtureTables = ["brands", "categories", "products", "collections", "galleries", "promotions"];
const fixtureCounts = {};
for (const table of fixtureTables) {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .ilike("slug", "fixture-fase2-%");
  if (error) throw new Error(`Falha ao validar limpeza de ${table}.`);
  fixtureCounts[table] = count ?? 0;
}

const managedBucketIds = ["brand-logos", "catalog-products", "site-galleries", "promotions"];
const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
if (bucketError) throw new Error("Falha ao validar buckets gerenciados.");
const managedBuckets = buckets.filter((bucket) => managedBucketIds.includes(bucket.id));
const temporaryUsers = authData.users.filter((user) =>
  user.email?.endsWith("@example.invalid") && user.email.startsWith("qa-"),
);
const report = {
  authorizedIdentityExactlyOne: matches.length === 1,
  authorizedProfileActiveAdmin: profiles?.length === 1
    && profiles[0].id === authorizedUser?.id
    && profiles[0].role === "admin"
    && profiles[0].active === true,
  bucketsPrivate: managedBuckets.length === managedBucketIds.length
    && managedBuckets.every((bucket) => bucket.public === false),
  fixtureStateAbsent: !fs.existsSync(path.resolve(".tmp/admin-qa/phase2-fixtures.json")),
  fixturesRemaining: fixtureCounts,
  temporaryQaUsersRemaining: temporaryUsers.length,
};
console.log(JSON.stringify(report, null, 2));

const passed = report.authorizedIdentityExactlyOne
  && report.authorizedProfileActiveAdmin
  && report.bucketsPrivate
  && report.fixtureStateAbsent
  && Object.values(fixtureCounts).every((count) => count === 0)
  && report.temporaryQaUsersRemaining === 0;
if (!passed) process.exitCode = 1;
