import assert from "node:assert/strict";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { LEGAL_CONFIG, getSupportGmailComposeUrl } from "../lib/legal-config";
import LegalLayout from "../components/LegalLayout";
import ContactSupportPage from "../app/contact/page";
import PrivacyPolicyPage from "../app/privacy/page";
import TermsOfServicePage from "../app/terms/page";
import RefundPolicyPage from "../app/refund-policy/page";

const direct = new URL(getSupportGmailComposeUrl("Billing & Refund Request"));
assert.equal(direct.origin, "https://mail.google.com");
assert.equal(direct.pathname, "/mail/");
assert.equal(direct.searchParams.get("view"), "cm");
assert.equal(direct.searchParams.get("fs"), "1");
assert.equal(direct.searchParams.get("to"), LEGAL_CONFIG.supportEmail);
assert.equal(direct.searchParams.get("su"), "Billing & Refund Request");
assert.equal([...direct.searchParams.keys()].length, 4, "Subjects cannot create unintended query parameters.");
assert.equal(new URL(getSupportGmailComposeUrl()).searchParams.get("su"), null);

const pages = [
  ["contact", <ContactSupportPage />, ["StrangerLens Support Request", "Report Access or Scan Help", "Billing or Refund Request", "Privacy Inquiry", "StrangerLens General Question"]],
  ["privacy", <PrivacyPolicyPage />, []],
  ["terms", <TermsOfServicePage />, []],
  ["refund-policy", <RefundPolicyPage />, ["StrangerLens Technical Delivery Issue", "Duplicate Charge Inquiry"]],
  ["shared legal layout", <LegalLayout activePage="contact" badge="CONTACT" title="Support" subtitle="Contact support">Details</LegalLayout>, []],
] as const;
for (const [name, element, subjects] of pages) {
  const dom = new JSDOM(renderToStaticMarkup(element), { url: "https://strangerlens.ai.studio/" });
  const links = [...dom.window.document.querySelectorAll<HTMLAnchorElement>('a[href*="mail.google.com"]')];
  assert.ok(links.length >= 1, name + ": at least one clickable Gmail support link.");
  for (const link of links) {
    const url = new URL(link.href);
    assert.equal(url.origin, "https://mail.google.com", name + ": no unintended website navigation");
    assert.equal(url.searchParams.get("view"), "cm");
    assert.equal(url.searchParams.get("fs"), "1");
    assert.equal(url.searchParams.get("to"), LEGAL_CONFIG.supportEmail);
    assert.equal(link.target, "_blank", "Gmail opens separately, without replacing StrangerLens.");
    assert.ok(link.rel.includes("noopener") && link.rel.includes("noreferrer"), "Cross-site link is secure.");
  }
  for (const subject of subjects) {
    assert.ok(links.some(link => new URL(link.href).searchParams.get("su") === subject),
      name + ": " + subject + " prefilled in Gmail.");
  }
  assert.ok(!dom.window.document.querySelector('a[href^="mailto:"]'), name + ": no browser mailto handler.");
  dom.window.close();
}

const footer = readFileSync("app/page.tsx", "utf8");
assert.ok(footer.includes("href={getSupportGmailComposeUrl()}"), "Landing support email opens Gmail.");
assert.ok(footer.includes('target="_blank" rel="noopener noreferrer"'), "External mail link is protected.");
for (const file of [
  "components/LegalLayout.tsx", "app/contact/page.tsx", "app/privacy/page.tsx",
  "app/terms/page.tsx", "app/refund-policy/page.tsx", "app/page.tsx"
]) {
  const source = readFileSync(file, "utf8");
  assert.ok(!source.includes("mailto:"), file + " must not use a misconfigured browser mail handler.");
}
console.log("PASS: every public legal/support contact action opens a safe, preaddressed Gmail compose draft.");
