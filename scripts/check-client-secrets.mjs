import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const clientRoot = path.join(root, ".next", "static");
if (!fs.existsSync(clientRoot)) throw new Error("Bundle cliente ausente; execute o build primeiro.");

function filesBelow(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesBelow(absolute));
    else result.push(absolute);
  }
  return result;
}

const secretNames = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
];
const secretValues = secretNames
  .map((name) => process.env[name]?.trim())
  .filter((value) => value && value.length >= 8);
const clientHits = [];
const clientFiles = filesBelow(clientRoot);
for (const file of clientFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (secretNames.some((name) => content.includes(name))) {
    clientHits.push({ file: path.relative(root, file), kind: "server_variable_name" });
  }
  if (secretValues.some((value) => content.includes(value))) {
    clientHits.push({ file: path.relative(root, file), kind: "local_secret_value" });
  }
  if (/sb_secret_[A-Za-z0-9_-]+/.test(content)) {
    clientHits.push({ file: path.relative(root, file), kind: "secret_key_prefix" });
  }
}

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root })
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const trackedHits = [];
for (const relative of tracked) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
  const content = fs.readFileSync(absolute, "utf8");
  if (secretValues.some((value) => content.includes(value))) {
    trackedHits.push({ file: relative, kind: "local_secret_value" });
  }
  if (/sb_secret_[A-Za-z0-9_-]{12,}/.test(content)) {
    trackedHits.push({ file: relative, kind: "secret_key_prefix" });
  }
}

const sourceMaps = clientFiles
  .filter((file) => file.endsWith(".map"))
  .map((file) => path.relative(root, file));
const report = {
  clientFilesScanned: clientFiles.length,
  clientHits,
  sourceMaps,
  trackedFilesScanned: tracked.length,
  trackedHits,
};
console.log(JSON.stringify(report, null, 2));
if (clientHits.length || trackedHits.length || sourceMaps.length) process.exitCode = 1;
