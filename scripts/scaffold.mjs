#!/usr/bin/env node
import { argv } from "node:process";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

function arg(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

const cmd = argv[2];
const cwd = resolve(arg("cwd") ?? process.cwd());

// Greenfield guard.
const HARD_STOP = ["package.json", "next.config.ts", "next.config.js", "next.config.mjs",
  "vite.config.ts", "vite.config.js", "app", "src", ".goodvibes",
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"];
const IGNORE = new Set([".git", ".vscode", "README.md", "LICENSE", ".gitignore",
  ".DS_Store", "Thumbs.db"]);

function strayFiles(dir) {
  return readdirSync(dir).filter((f) => !IGNORE.has(f));
}

function isGreenfield(dir) {
  for (const sig of HARD_STOP) if (existsSync(join(dir, sig))) return false;
  return strayFiles(dir).length === 0 ? true : "warn";
}

if (cmd === "check") {
  const g = isGreenfield(cwd);
  if (g === false) { console.error("not-greenfield"); process.exit(1); }
  if (g === "warn") { console.error(`non-empty: ${strayFiles(cwd).join(", ")}`); process.exit(2); }
  console.log("greenfield"); process.exit(0);
}

if (cmd === "create") {
  const variant = arg("variant");
  const pluginRoot = resolve(arg("plugin-root") ?? ".");
  if (variant !== "full-stack" && variant !== "client-only") {
    console.error(`unknown variant: ${variant}`); process.exit(1);
  }
  const variantDir = join(pluginRoot, "variants", variant);
  const DOCS = ["principled-coding.md", "ui-design-principles.md", "writing-voice-guide.md"];

  // List the variant, skipping deps and build artifacts.
  // Skip whole dirs by name, and a few files by name (build cache + real env
  // files). Keep .env.example — it is a wanted template.
  const SKIP = new Set(["node_modules", "dist", ".next", ".git"]);
  const skipFile = (name) =>
    name.endsWith(".tsbuildinfo") || name === ".env" || /^\.env\..*local$/.test(name);
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : walk(full);
    return skipFile(entry.name) ? [] : [relative(variantDir, full)];
  });
  const files = walk(variantDir);

  // 1. Refuse before writing anything if a file would be overwritten. README.md and
  // .gitignore are allowed in an otherwise empty folder, so those two get merged.
  const MERGED = new Set(["README.md", ".gitignore"]);
  const outputs = [...files, "CLAUDE.md", ".goodvibes", ...DOCS.map((d) => join("docs", d))];
  const collisions = outputs.filter((f) => !MERGED.has(f) && existsSync(join(cwd, f)));
  if (collisions.length > 0) {
    console.error(`would overwrite: ${collisions.join(", ")}`); process.exit(1);
  }

  // 2. Copy the variant into cwd, keeping what the folder already had in the merged
  // files: their README stays on top, and the starter's .gitignore lines are added
  // to theirs because those lines keep secrets out of git.
  for (const file of files) {
    const dest = join(cwd, file);
    mkdirSync(dirname(dest), { recursive: true });
    if (MERGED.has(file) && existsSync(dest)) {
      const theirs = readFileSync(dest, "utf8");
      const ours = readFileSync(join(variantDir, file), "utf8");
      if (file === "README.md") {
        writeFileSync(dest, `${theirs.trimEnd()}\n\n${ours}`);
      } else {
        const have = new Set(theirs.split(/\r?\n/));
        const add = ours.split(/\r?\n/).filter((line) => line && !have.has(line));
        writeFileSync(dest, `${theirs.trimEnd()}\n${add.join("\n")}\n`);
      }
    } else {
      cpSync(join(variantDir, file), dest);
    }
  }

  // 3. Compose CLAUDE.md: system-prompt body below the line-18 '---' + the additions.
  const sp = readFileSync(join(pluginRoot, "kit", "system-prompt.md"), "utf8");
  const marker = sp.indexOf("\n---\n");
  const body = marker >= 0 ? sp.slice(marker + 5) : sp;
  const additions = ["integration-guardrails.md", "storage-calibration.md", "going-live.md"];
  if (variant === "full-stack") additions.push("adding-a-table.md");
  const sections = additions.map((a) => readFileSync(join(pluginRoot, "kit", "_additions", a), "utf8").trim());
  // Full-stack ships an AGENTS.md pointing agents at Next.js's version-matched
  // bundled docs; import it into CLAUDE.md so Claude Code reads it too.
  const agentsImport = variant === "full-stack" ? "\n@AGENTS.md\n" : "";
  writeFileSync(join(cwd, "CLAUDE.md"), `${[body.trim(), ...sections].join("\n\n")}\n${agentsImport}`);

  // 4. Copy the developer-facing docs into docs/.
  const docsDir = join(cwd, "docs");
  mkdirSync(docsDir, { recursive: true });
  for (const d of DOCS) {
    cpSync(join(pluginRoot, "kit", d), join(docsDir, d));
  }

  // 5. Version stamp. `live` flips to true when the developer connects hosting;
  // from then on save-to-github uses a branch and a pull request.
  const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  const stamp = { plugin: "goodvibes", version: manifest.version ?? "unknown", variant, generatedAt: new Date().toISOString(), live: false };
  writeFileSync(join(cwd, ".goodvibes"), JSON.stringify(stamp, null, 2) + "\n");

  console.log(`scaffolded ${variant} (goodvibes ${stamp.version})`);
  process.exit(0);
}

console.error("usage: scaffold.mjs check|create [...]"); process.exit(1);
