import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BroadcastRecipientPanel } from "../src/features/settings/BroadcastRecipientPanel";

describe("Recipient presentation", () => {
  const items = [
    {
      id: "first",
      title: "First update",
      body: '<script>alert("synthetic")</script>',
      createdAt: "2026-10-23T12:00:00Z",
    },
    {
      id: "next",
      title: "Second update",
      body: "Next message",
      createdAt: "2026-10-24T12:00:00Z",
    },
  ];
  const acknowledge = vi.fn();
  const render = (overrides = {}) =>
    renderToStaticMarkup(
      createElement(BroadcastRecipientPanel, {
        items,
        loading: false,
        refresh: vi.fn(),
        acknowledge,
        scope: {},
        ...overrides,
      }),
    );
  it("renders only the first policy-ordered message without acknowledging on view", () => {
    const html = render();
    expect(html).toContain("First update");
    expect(html).not.toContain("Second update");
    expect(html).toContain("2 updates");
    expect(html).toContain("Acknowledge update");
    expect(html).not.toContain("Dismiss");
    expect(acknowledge).not.toHaveBeenCalled();
  });
  it("escapes broadcast content and never mounts stale messages during replacement reads", () => {
    expect(render()).toContain("&lt;script&gt;");
    expect(render()).not.toContain("<script>");
    expect(render({ loading: true })).toBe("");
    expect(render({ items: [] })).toBe("");
  });
  it("shows a read failure rather than an empty-success inbox", () => {
    expect(
      render({ error: new Error("Access no longer available") }),
    ).toContain("Access no longer available");
    expect(
      render({ error: new Error("Access no longer available") }),
    ).not.toContain("First update");
  });
});
