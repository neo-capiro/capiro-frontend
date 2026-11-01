import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PreviewLinks } from "../src/features/modules/workspace/rich-newsletter/PreviewLinks";
import { previewLinkStatus } from "../src/features/modules/workspace/rich-newsletter/content/preview-links";

describe("local newsletter link checks", () => {
  it.each([
    ["https://example.test/story", false, "Valid destination"],
    ["mailto:editor@example.test", false, "Valid destination"],
    ["tel:+12025550123", false, "Valid destination"],
    ["#summary", true, "Valid destination"],
    [" #summary ", true, "Valid destination"],
    ["#missing", false, "Check destination"],
    ["javascript:alert(1)", false, "Check destination"],
    ["data:text/html,unsafe", false, "Check destination"],
    ["https://user:password@example.test", false, "Check destination"],
    ["", false, "Check destination"],
    ["*|UNSUB|*", false, "Resolved in Outreach"],
    ["*|ARCHIVE|*", false, "Resolved in Outreach"],
    ["*|UPDATE_PROFILE|*", false, "Resolved in Outreach"],
    ["https://example.test/?email=*|EMAIL|*", false, "Resolved in Outreach"],
    ["https://example.test/?value=*|UNKNOWN|*", false, "Check destination"],
    ["*|UNKNOWN|*", false, "Check destination"],
  ])("classifies %s without requesting it", (url, anchor, expected) => {
    expect(previewLinkStatus(String(url), Boolean(anchor))).toBe(expected);
  });

  it("renders destination text inertly and distinguishes format from availability", () => {
    const html = renderToStaticMarkup(
      createElement(PreviewLinks, {
        links: [
          {
            key: "unsafe",
            label: "<img src=x onerror=alert(1)>",
            url: "javascript:alert(1)",
            status: "Check destination",
          },
        ],
      }),
    );
    expect(html).toContain("Check email links");
    expect(html).toContain("0 of 1 links reviewed");
    expect(html).toContain("do not contact websites");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("<iframe");
  });
});
