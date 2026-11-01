import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CampaignTemplates,
  TemplatePreviewContent,
} from "../src/features/modules/engagement/outreach/CampaignTemplates";
const boundary = vi.hoisted(() => ({ api: { request: vi.fn() } }));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => boundary.api,
}));
const row = {
  id: "system-synthetic",
  source: "system" as const,
  name: "Synthetic template",
  category: "general",
  prompt: "<script>never execute()</script>",
  description: "<img src=x onerror=send()>",
  samplePreview: '<iframe src="https://invalid.example.test">sample</iframe>',
  tone: "professional",
  usageCount: 0,
};
beforeEach(() => {
  boundary.api.request.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No network permitted");
    }),
  );
});
describe("literal local template preview", () => {
  it("escapes stored text instead of rendering or executing HTML and makes no API/provider request", () => {
    const markup = renderToStaticMarkup(
      createElement(TemplatePreviewContent, { template: row }),
    );
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).toContain("&lt;iframe");
    expect(markup).toContain("&lt;img");
    expect(markup).not.toMatch(/<(script|iframe|img)\b/);
    expect(markup).toContain("saved example, not a generated message");
    expect(boundary.api.request).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([null, ""])(
    "shows absent sample honestly without generating one (%s)",
    (samplePreview) => {
      const markup = renderToStaticMarkup(
        createElement(TemplatePreviewContent, {
          template: { ...row, samplePreview },
        }),
      );
      expect(markup).toContain("no saved sample output");
      expect(fetch).not.toHaveBeenCalled();
      expect(boundary.api.request).not.toHaveBeenCalled();
    },
  );
  it("renders actual catalog options, local preview controls and custom creation without writes on mount", () => {
    const markup = renderToStaticMarkup(
      createElement(CampaignTemplates, {
        templates: [row],
        selectedId: row.id,
        disabled: false,
        onSelect: vi.fn(),
        onReload: vi.fn(),
      }),
    );
    expect(markup).toContain("Preview Synthetic template");
    expect(markup).toContain("Create custom template");
    expect(markup).toContain('checked=""');
    expect(boundary.api.request).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retains disabled fieldset semantics for all creation/selection controls", () => {
    const markup = renderToStaticMarkup(
      createElement(CampaignTemplates, {
        templates: [row],
        selectedId: null,
        disabled: true,
        onSelect: vi.fn(),
        onReload: vi.fn(),
      }),
    );
    expect(markup).toMatch(/<fieldset[^>]+disabled=""/);
    expect(boundary.api.request).not.toHaveBeenCalled();
  });
});
