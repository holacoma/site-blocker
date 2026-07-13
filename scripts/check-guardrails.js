#!/usr/bin/env node
// Automated checks for repo conventions documented in CLAUDE.md's Guardrails
// section. Run via `npm run check:guardrails`.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const EM_DASH = "—";
const projectRoot = new URL("..", import.meta.url).pathname;

let failed = false;

/** @param {string} message */
function fail(message) {
  failed = true;
  console.error(`✗ ${message}`);
}

function checkLocaleFiles() {
  const localesDir = join(projectRoot, "_locales");
  for (const lang of readdirSync(localesDir)) {
    const filePath = join(localesDir, lang, "messages.json");
    const messages = JSON.parse(readFileSync(filePath, "utf8"));
    for (const [key, entry] of Object.entries(messages)) {
      if (typeof entry.message === "string" && entry.message.includes(EM_DASH)) {
        fail(`_locales/${lang}/messages.json: key "${key}" contains an em dash (—)`);
      }
    }
  }
}

function checkI18nFile() {
  const filePath = join(projectRoot, "shared/i18n.js");
  const lines = readFileSync(filePath, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes(EM_DASH)) {
      fail(`shared/i18n.js:${i + 1}: contains an em dash (—)`);
    }
  });
}

checkLocaleFiles();
checkI18nFile();

if (failed) {
  console.error("\nGuardrail check failed: no usar guiones largos (—) en textos de UI/i18n.");
  console.error("Reemplazá con coma, dos puntos, o reestructurá la oración.");
  process.exit(1);
}

console.log("Guardrail checks passed.");
