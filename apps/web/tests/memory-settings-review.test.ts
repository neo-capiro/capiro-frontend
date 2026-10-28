import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import SettingsPage from "../src/app/settings/[section]/page";
import { MemorySettings } from "../src/features/settings/MemorySettings";

afterEach(() => vi.unstubAllEnvs());

it("passes the private server flag through the Settings route", async () => {
  vi.stubEnv("MERI_MEMORY_OWNER_REVIEW_ENABLED", "false");
  const held = await SettingsPage({
    params: Promise.resolve({ section: "memory" }),
  });
  expect(held.props.children.props.memoryReviewEnabled).toBe(false);

  vi.stubEnv("MERI_MEMORY_OWNER_REVIEW_ENABLED", "true");
  const enabled = await SettingsPage({
    params: Promise.resolve({ section: "memory" }),
  });
  expect(enabled.props.children.props.memoryReviewEnabled).toBe(true);
});

it("holds the native personal review route when the server gate is closed", () => {
  const html = renderToStaticMarkup(
    createElement(MemorySettings, { reviewEnabled: false }),
  );
  expect(html).toContain("Personal memory review unavailable");
  expect(html).not.toContain('href="/meri/memory"');
  expect(html).not.toContain("Needs my review");
  expect(html).toContain("New memory writes from Settings are unavailable");
});

it("links to the Core-backed personal review and correction route when enabled", () => {
  const html = renderToStaticMarkup(
    createElement(MemorySettings, { reviewEnabled: true }),
  );
  expect(html).toContain('href="/meri/memory"');
  expect(html).toContain("Open personal memory review");
  expect(html).toContain("propose corrections");
  expect(html).toContain('href="/meri/updates"');
  expect(html).not.toContain("Needs my review");
  expect(html).not.toContain("Memory review data is unavailable");
});
