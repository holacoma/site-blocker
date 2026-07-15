import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, test, expect } from "vitest";

const css = readFileSync(resolve("pages/dark.css"), "utf8");

const rules = css
  .split("\n")
  .map(l => l.trim())
  .filter(l => l.startsWith("html[data-darkmode") && l.includes("{"));

const variableBlock    = /^html\[data-darkmode="on"\]\s*\{/;
const themeScopedRule  = /\[data-theme=/;

// Selectores que aplican a todos los temas intencionalmente.
const intentionallyUnscoped = [];

describe("dark.css — selectores de UI acotados por tema", () => {
  test("ningún selector de UI carece de [data-theme] sin ser intencional", () => {
    const unscoped = rules.filter(rule =>
      !variableBlock.test(rule) &&
      !themeScopedRule.test(rule) &&
      !intentionallyUnscoped.some(allowed => rule.startsWith(allowed))
    );
    expect(unscoped).toEqual([]);
  });

  test("el allowlist de no-scoped coincide exactamente con lo que existe en el CSS", () => {
    const actualUnscoped = rules
      .filter(rule => !variableBlock.test(rule) && !themeScopedRule.test(rule))
      .map(rule => rule.split("{")[0].trim());

    const allowedPrefixes = intentionallyUnscoped;
    const unexpected = actualUnscoped.filter(
      sel => !allowedPrefixes.some(a => sel.startsWith(a))
    );
    expect(unexpected).toEqual([]);
  });
});
