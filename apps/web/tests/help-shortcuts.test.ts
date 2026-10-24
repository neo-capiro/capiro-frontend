import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HelpShortcutsScreen } from "../src/features/meri/screens/settings/HelpShortcutsScreen";
import { help } from "../src/features/meri/screens/settings/unavailable-account";

describe("Help without a support submission owner", () => {
  const render = (localDrafts = false, summary = "") =>
    renderToStaticMarkup(
      createElement(HelpShortcutsScreen, {
        chrome: {
          nav: [],
          embedded: true,
          headerOverlays: false,
          localDrafts,
          notice: { title: "Unavailable", detail: "No connected service" },
          unavailable: "Not connected",
        },
        view: {
          ...help,
          report: {
            ...help.report,
            summary: { ...help.report.summary, value: summary },
          },
        },
      }),
    );
  it("renders no submitted receipt on a fresh page and leaves submit disabled", () => {
    const html = render();
    expect(html).toContain("No report has been sent.");
    expect(html).not.toMatch(
      /Report submitted|Problem report sent|Designed receipt/,
    );
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*>Submit feedback<\/button>/,
    );
  });
  it("does not claim fixture-only search shortcuts are registered in the connected app", () => {
    expect(help.shortcuts.rows.map((item) => item.id)).toEqual([
      "send",
      "line",
      "close",
      "move",
    ]);
    expect(help.shortcuts.footnote).toContain("not available");
  });
  it("keeps local synthetic draft text inert and reports unsupported attachments", () => {
    const html = render(true, '<script>alert("synthetic")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Attachments are not supported.");
    expect(html).toContain("No report has been sent.");
  });
});
