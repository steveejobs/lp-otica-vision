import { cpSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "dist";

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "instagram"), { recursive: true });

copyFileSync("index.html", join(outDir, "index.html"));
copyFileSync("styles.css", join(outDir, "styles.css"));
copyFileSync("instagram/index.html", join(outDir, "instagram", "index.html"));
cpSync("galeria", join(outDir, "galeria"), { recursive: true });

console.log("build ok");
