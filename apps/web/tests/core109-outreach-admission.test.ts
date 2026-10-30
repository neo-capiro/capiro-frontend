import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OutreachView } from "../src/features/modules/engagement/OutreachView";
import type { OutreachRecord } from "../src/shared/capiro/operations/engagement";

/**
 * CORE-109 destination admission, adapted to the canonical campaign owner.
 *
 * The identical-draft-link admission this file used to drive through
 * `engagement.outreach.record` now lives inside the workflow: a foreign
 * canonical response never opens an editable campaign. That behaviour is covered
 * by `outreach/campaign-model.test.ts` ("accepts case-equivalent known IDs but
 * refuses another campaign before edit admission", "refuses cross-campaign
 * drafts…") and by the mounted browser spec
 * `test/browser/outreach-canonical.spec.ts` ("foreign canonical response never
 * opens an editable campaign").
 *
 * What remains at this component's own boundary is list-scope admission: a row
 * returned for a client outside the requested scope must not be shown at all.
 * These cases keep the same refusals, error propagation and pending-read
 * behaviour, and additionally assert that an admitted row is actually visible.
 */
const state = vi.hoisted(() => ({
  data: undefined as OutreachRecord[] | undefined,
  sessions: [] as { id: string; title?: string; topic?: string }[],
  loading: false,
  error: undefined as Error | undefined,
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) =>
    key === "engagement.outreach"
      ? { ...state, reload: () => {} }
      : { data: state.sessions, loading: false, reload: () => {} },
  useCapiroMutation: () => ({ pending: false, run: vi.fn() }),
}));
const clientId = "10000000-0000-4000-8000-000000000001";
const recordId = "40000000-0000-4000-8000-000000000004";
const record: OutreachRecord = {
  id: recordId,
  title: "Synthetic permitted Classic record",
  type: "follow_up",
  status: "draft",
  subject: "Current subject",
  body: "Current body",
  client: { id: clientId, name: "Synthetic client" },
};
const MISMATCH = "The returned outreach does not match this client scope.";
const render = (scope = clientId) =>
  renderToStaticMarkup(createElement(OutreachView, { clientId: scope }));
beforeEach(() =>
  Object.assign(state, {
    data: [record],
    sessions: [],
    loading: false,
    error: undefined,
  }),
);

describe("CORE-109 current Outreach destination admission", () => {
  it("preserves the existing wrong-client refusal", () => {
    state.data = [
      {
        ...record,
        client: { id: "20000000-0000-4000-8000-000000000002", name: "Other client" },
      },
    ];
    const html = render();
    expect(html).toContain(MISMATCH);
    expect(html).not.toContain(record.title);
  });
  for (const client of [
    { id: "20000000-0000-4000-8000-000000000002", name: "Other client" },
    null,
    undefined,
  ]) {
    it(`refuses a ${client ? "different" : String(client)} current client association`, () => {
      state.data = [{ ...record, client }];
      const html = render();
      expect(html).toContain(MISMATCH);
      expect(html).not.toContain(record.title);
    });
  }
  it("admits a matching current record/client without synthesizing version identity", () => {
    const html = render();
    expect(html).not.toContain("Unable to load this view");
    expect(html).toContain("+ New outreach");
    expect(html).toContain(record.title);
    expect(html).not.toContain("immutable revision");
  });
  it("retains existing unscoped Classic list behavior", () => {
    state.data = [{ ...record, client: null }];
    const html = render("");
    expect(html).not.toContain("Unable to load this view");
    expect(html).toContain(record.title);
    expect(html).not.toContain(MISMATCH);
  });
  for (const message of [
    "Outreach record not found",
    "Forbidden",
    "Service unavailable",
  ]) {
    it(`does not replace a failed exact destination with a blank draft: ${message}`, () => {
      state.error = new Error(message);
      const html = render();
      expect(html).toContain(message);
      // A failed read never opens an editable destination. The list may keep
      // showing already-permitted rows (the query retains data by design); what
      // it must never do is mount a campaign surface off the failed read.
      expect(html).not.toContain("Campaign name");
    });
  }
  it("withholds stale supplied data while the current exact read is pending", () => {
    state.loading = true;
    const html = render();
    expect(html).toContain("Loading");
    expect(html).not.toContain("Campaign name");
  });
});
