import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import BrandMark from "../components/BrandMark";
import ChromaticAtmosphere from "../components/landing/ChromaticAtmosphere";

const css = readFileSync("app/quiet-ai-theme.css", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const app = readFileSync("app/page.tsx", "utf8");
const icon = readFileSync("app/icon.svg", "utf8");
const quietImport = globals.indexOf('@import "./quiet-ai-theme.css";');
assert.ok(quietImport > globals.indexOf('@import "./app-theme.css";'), "Quiet AI theme loads after legacy sheets");
for (const token of [
  "--quiet-page:#F8F8F6", "--quiet-ink:#1C1D20",
  "--quiet-border:#E3E3DF", "--quiet-cta:#1D1E20",
  "--quiet-page:#111214", "background:var(--quiet-cta)!important",
]) assert.ok(css.includes(token), `Missing neutral design token: ${token}`);
assert.ok(css.includes(".sl-atmosphere") && css.includes("display:none!important"),
  "No old visual decoration should appear");
assert.ok(css.includes(".sl-v7-upgrade-button"), "Paid report action is part of the shared neutral design");
assert.equal(renderToStaticMarkup(<ChromaticAtmosphere variant="hero" />), "",
  "Animated hero aurora is not rendered");
assert.equal(renderToStaticMarkup(<ChromaticAtmosphere variant="threads" />), "",
  "Decorative focus lines are not rendered");
const logo = renderToStaticMarkup(<BrandMark />);
assert.ok(logo.includes("currentColor") && !logo.includes("#A9F2FF"), "Brand mark uses one color");
assert.ok(!icon.includes("linearGradient") && icon.includes("#1B1C1F"), "Favicon is monochrome");
assert.ok(app.includes("Your website makes sense to you.") && app.includes("someone new?"),
  "Hero uses the clear, human-first copy");
assert.ok(app.includes('item.href.startsWith("/")'), "Footer internal routes are not handled as section anchors");
console.log("PASS: Quiet AI tokens, no aurora, monochrome brand, grounded hero and route-safe footer.");
