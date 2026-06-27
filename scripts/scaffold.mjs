#!/usr/bin/env node
import { argv } from "node:process";
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

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

function isGreenfield(dir) {
  for (const sig of HARD_STOP) if (existsSync(join(dir, sig))) return false;
  const leftover = readdirSync(dir).filter((f) => !IGNORE.has(f));
  return leftover.length === 0 ? true : "warn";
}

if (cmd === "check") {
  const g = isGreenfield(cwd);
  if (g === false) { console.error("not-greenfield"); process.exit(1); }
  if (g === "warn") { console.error("non-empty"); process.exit(2); }
  console.log("greenfield"); process.exit(0);
}

if (cmd === "create") {
  const variant = arg("variant");
  const pluginRoot = resolve(arg("plugin-root") ?? ".");
  if (variant !== "full-stack" && variant !== "client-only") {
    console.error(`unknown variant: ${variant}`); process.exit(1);
  }
  // 1. Copy the variant into cwd, skipping deps and build artifacts.
  // Skip whole dirs by segment name, and a few files by name (build cache + real
  // env files). Keep .env.example — it is a wanted template.
  const SKIP = new Set(["node_modules", "dist", ".next", ".git"]);
  const skipFile = (name) =>
    name.endsWith(".tsbuildinfo") || name === ".env" || /^\.env\..*local$/.test(name);
  cpSync(join(pluginRoot, "variants", variant), cwd, {
    recursive: true,
    filter: (src) => {
      const segs = src.split(/[\\/]/);
      if (segs.some((seg) => SKIP.has(seg))) return false;
      return !skipFile(segs[segs.length - 1]);
    },
  });

  // 2. Compose CLAUDE.md: system-prompt body below the line-18 '---' + the two additions.
  const sp = readFileSync(join(pluginRoot, "kit", "system-prompt.md"), "utf8");
  const marker = sp.indexOf("\n---\n");
  const body = marker >= 0 ? sp.slice(marker + 5) : sp;
  const add1 = readFileSync(join(pluginRoot, "kit", "_additions", "integration-guardrails.md"), "utf8");
  const add2 = readFileSync(join(pluginRoot, "kit", "_additions", "storage-calibration.md"), "utf8");
  // Full-stack ships an AGENTS.md pointing agents at Next.js's version-matched
  // bundled docs; import it into CLAUDE.md so Claude Code reads it too.
  const agentsImport = variant === "full-stack" ? "\n@AGENTS.md\n" : "";
  writeFileSync(join(cwd, "CLAUDE.md"), `${body.trim()}\n\n${add1.trim()}\n\n${add2.trim()}\n${agentsImport}`);

  // 3. Copy the developer-facing docs into docs/.
  const docsDir = join(cwd, "docs");
  mkdirSync(docsDir, { recursive: true });
  for (const d of ["principled-coding.md", "ui-design-principles.md", "writing-voice-guide.md"]) {
    cpSync(join(pluginRoot, "kit", d), join(docsDir, d));
  }

  // 4. Version stamp.
  const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"));
  const stamp = { plugin: "goodvibes", version: manifest.version ?? "unknown", variant, generatedAt: new Date().toISOString() };
  writeFileSync(join(cwd, ".goodvibes"), JSON.stringify(stamp, null, 2) + "\n");

  console.log(`scaffolded ${variant} (goodvibes ${stamp.version})`);
  process.exit(0);
}

console.error("usage: scaffold.mjs check|create [...]"); process.exit(1);
