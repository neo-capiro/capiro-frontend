import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivityFeed } from "../src/features/portfolio/client-profile/ActivityFeed";
import type { Activity } from "../src/features/portfolio/client-profile/contracts";

vi.mock("../src/features/portfolio/client-profile/ActivityActions", () => ({
  ActivityActions: () => null,
}));
vi.mock("@/features/portfolio/relationships/thread/public", () => ({
  TimelineMailThread: () => createElement("span", null, "Existing mail reader"),
}));
const clientId = "10000000-0000-4000-8000-000000000001";
const recordId = "40000000-0000-4000-8000-000000000004";
const activity: Activity = {
  id: `outreach:${recordId}`,
  kind: "outreach",
  title: "Synthetic current outreach",
  body: "follow_up · draft",
  occurredAt: "2026-10-13T10:00:00Z",
  sourceType: "outreach",
  sourceId: recordId,
  origin: "derived",
  pinned: false,
  dueAt: null,
  settledAt: null,
};
function render(row = activity, scope = clientId, expanded = false) {
  return renderToStaticMarkup(
    createElement(ActivityFeed, {
      clientId: scope,
      rows: [row],
      zone: "UTC",
      expanded,
      onFallbackFocus: () => {},
    }),
  );
}

describe("CORE-109 rendered activity source handoff", () => {
  for (const expanded of [false, true]) {
    it(`links the supplied Classic record ID in ${expanded ? "history" : "overview"}`, () => {
      const html = render(activity, clientId, expanded);
      expect(html).toContain(
        `href="/modules/engagement?clientId=${clientId}&amp;draft=${recordId}"`,
      );
      expect(html).toContain("Open outreach");
      expect(html).not.toContain("session=");
      expect(html).not.toContain("version=");
    });
  }
  for (const sourceId of [null, "", "not-a-uuid", "../outreach-v3/session"]) {
    it(`does not infer a route from malformed source ${String(sourceId)}`, () => {
      expect(render({ ...activity, sourceId })).not.toContain("Open outreach");
    });
  }
  it("requires an exact client ID and does not infer source type from row title/id", () => {
    expect(render(activity, "wrong/client")).not.toContain("Open outreach");
    expect(render({ ...activity, sourceType: null })).not.toContain(
      "Open outreach",
    );
  });
  for (const [sourceType, path, label] of [
    ["meeting", "calendar?meeting", "Open meeting"],
    ["attachment", "files?file", "Open file"],
  ] as const) {
    it(`preserves the existing ${sourceType} source destination`, () => {
      const html = render({ ...activity, sourceType });
      expect(html).toContain(
        `href="/portfolio/${clientId}/${path}=${recordId}"`,
      );
      expect(html).toContain(label);
      expect(html).not.toContain("Open outreach");
    });
  }
  it("retains the existing inline mail reader rather than treating mail as outreach", () => {
    const html = render({
      ...activity,
      kind: "email",
      sourceType: "mail_thread",
    });
    expect(html).toContain("Existing mail reader");
    expect(html).not.toContain("Open outreach");
  });
});
