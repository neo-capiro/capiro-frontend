import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AttentionItem } from "../src/features/portfolio/index/attention/AttentionItem";

const clientId = "10000000-0000-4000-8000-000000000001";
const alert = {
  id: `${clientId}:change:source-record-a`,
  clientId,
  clientName: "Synthetic client",
  title: "Repeated source headline",
  subtitle: "Recorded update",
  type: "bill_text_updated",
  severity: "info",
  when: "2026-11-05T00:00:00Z",
  countdownDays: null,
  countdownLabel: null,
  href: "javascript:alert(1)",
  canonicalComplete: false,
  canonicalMissingFields: ["issueId", "whoActs"],
};

it("opens the exact authorized alert rather than silently substituting the client profile", () => {
  const html = renderToStaticMarkup(createElement(AttentionItem, { alert }));
  expect(html).toContain(
    `href="/portfolio?alert=${encodeURIComponent(alert.id)}"`,
  );
  expect(html).toContain("change:source-record-a");
  expect(html).not.toContain("javascript:");
});

it("keeps distinct source records distinguishable when their other visible fields are identical", () => {
  const first = renderToStaticMarkup(createElement(AttentionItem, { alert }));
  const second = renderToStaticMarkup(
    createElement(AttentionItem, {
      alert: { ...alert, id: `${clientId}:change:source-record-b` },
    }),
  );
  expect(first).toContain("change:source-record-a");
  expect(second).toContain("change:source-record-b");
});
