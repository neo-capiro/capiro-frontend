import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { draft, actor } from "./prospect-resources-fixtures";

const state = vi.hoisted(() => ({ html: "", pending: false }));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({
    data:
      key === "workspace.draft"
        ? {
            ...draft,
            config: {
              sections: ["Body"],
              sectionContent: { Body: state.html },
            },
          }
        : key === "me.read"
          ? {
              tenant: { id: actor.tenantId },
              user: { id: actor.userId, clerkUserId: "test-user" },
            }
          : [],
    loading: false,
    reload: () => {},
  }),
  useCapiroMutation: () => ({ pending: false, run: vi.fn() }),
}));
vi.mock(
  "../src/features/modules/workspace/prospects/useProspectDraftSave",
  () => ({
    useProspectDraftSave: (currentDraft: typeof draft) => ({
      currentDraft,
      ready: true,
      canSave: !state.pending,
      pending: state.pending,
      save: vi.fn(),
      readCurrent: vi.fn(),
    }),
  }),
);
vi.mock(
  "../src/features/modules/workspace/prospects/ProspectDraftExport",
  () => ({ ProspectDraftExport: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/newsletter/NewsletterWorkflow",
  () => ({ NewsletterWorkflow: () => null }),
);
import { WorkspaceDraft } from "../src/features/modules/workspace/WorkspaceDraft";
const render = (expectedClientId?: string) =>
  renderToStaticMarkup(
    createElement(WorkspaceDraft, {
      id: draft.id,
      prospectId: draft.prospectId,
      expectedClientId,
      onClose: () => {},
    }),
  );

describe("manual prospect Workspace presentation", () => {
  beforeEach(() => {
    state.html = "Plain & literal < example";
    state.pending = false;
  });
  it("keeps plain input usable and offers an explicit rich-formatting action", () => {
    const html = render();
    expect(html).toContain('aria-label="Body content"');
    expect(html).toContain("Plain &amp; literal &lt; example</textarea>");
    expect(html).toContain("Format text");
  });
  it("keeps the prospect owner responsible for prospect admission when a client hint is present", () => {
    const html = render("90000000-0000-4000-8000-000000000001");
    expect(html).toContain('aria-label="Body content"');
    expect(html).not.toContain("Document unavailable");
  });
  it("opens existing formatted sections without exposing literal HTML in a textarea", () => {
    state.html = "<p>A <strong>formatted</strong> draft</p>";
    const html = render();
    expect(html).not.toContain("</textarea>");
    expect(html).toContain("Loading document editor");
  });
  it("freezes the existing plain section while a save receipt is pending", () => {
    state.pending = true;
    const html = render();
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Format text<\/button>/);
  });
});
