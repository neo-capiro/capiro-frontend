import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OutreachView } from "../src/features/modules/engagement/OutreachView";
import type { OutreachRecord } from "../src/shared/capiro/operations/engagement";

const state = vi.hoisted(() => ({
  data: undefined as OutreachRecord | undefined,
  loading: false,
  error: undefined as Error | undefined,
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) =>
    key === "engagement.outreach.record"
      ? { ...state, reload: () => {} }
      : { data: [], loading: false, reload: () => {} },
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
const render = (scope = clientId) =>
  renderToStaticMarkup(
    createElement(OutreachView, { clientId: scope, initialDraft: recordId }),
  );
beforeEach(() =>
  Object.assign(state, { data: record, loading: false, error: undefined }),
);

describe("CORE-109 current Outreach destination admission", () => {
  it("preserves the existing wrong-record refusal", () => {
    state.data = { ...record, id: "50000000-0000-4000-8000-000000000005" };
    expect(render()).toContain(
      "The returned outreach does not match this link.",
    );
  });
  for (const client of [
    { id: "20000000-0000-4000-8000-000000000002", name: "Other client" },
    null,
    undefined,
  ]) {
    it(`refuses a ${client ? "different" : String(client)} current client association`, () => {
      state.data = { ...record, client };
      const html = render();
      expect(html).toContain("The returned outreach does not match this link.");
      expect(html).not.toContain("New outreach");
      expect(html).not.toContain(record.title);
    });
  }
  it("admits a matching current record/client without synthesizing version identity", () => {
    const html = render();
    expect(html).not.toContain("Unable to load this view");
    expect(html).toContain("New outreach");
    expect(html).not.toContain("immutable revision");
  });
  it("retains existing unscoped Classic list behavior", () => {
    state.data = { ...record, client: null };
    expect(render("")).not.toContain("Unable to load this view");
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
      expect(html).not.toContain("New outreach");
      expect(html).not.toContain(record.title);
    });
  }
  it("withholds stale supplied data while the current exact read is pending", () => {
    state.loading = true;
    const html = render();
    expect(html).toContain("Loading");
    expect(html).not.toContain("New outreach");
    expect(html).not.toContain(record.title);
  });
});
