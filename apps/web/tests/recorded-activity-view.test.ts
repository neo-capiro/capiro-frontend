import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordedActivity } from "../src/features/portfolio/client-profile/RecordedActivity";
import type { RecordedActivityResponse } from "../src/features/portfolio/client-profile/recorded-activity-contract";
const state = vi.hoisted(() => ({
  pending: false,
  data: undefined as RecordedActivityResponse | undefined,
}));
vi.mock("../src/features/portfolio/client-profile/useRecordedActivity", () => ({
  useRecordedActivity: () => state,
}));
const counts = {
  meetings: 1,
  emails: 2,
  tasksCompleted: 3,
  debriefs: 4,
  outreachSent: 5,
};
const complete = (): RecordedActivityResponse => ({
  version: 1,
  measure: "recorded_activity_index",
  basis: "Recorded activity index",
  disclosure:
    "Measures internal logging, not relationship quality or effectiveness.",
  scope: {
    tenantId: "synthetic-tenant",
    actorUserId: "synthetic-user",
    clientId: "client-a",
  },
  asOf: "2026-10-31T12:00:00.000Z",
  period: "7d",
  window: { from: "2026-10-24T12:00:00.000Z", to: "2026-10-31T12:00:00.000Z" },
  comparisonWindow: {
    from: "2026-10-17T12:00:00.000Z",
    to: "2026-10-24T12:00:00.000Z",
  },
  timestampBasis: {
    meetings: "startsAt",
    emails: "mailThread.lastMessageAt",
    tasksCompleted: "doneTask.updatedAt",
    debriefs: "createdAt",
    outreachSent: "sentAt",
  },
  status: "complete",
  reason: null,
  score: 100,
  priorScore: 100,
  breakdown: counts,
  priorBreakdown: counts,
  trend: "stable",
});
const render = () =>
  renderToStaticMarkup(
    createElement(RecordedActivity, { clientId: "client-a", version: 1 }),
  );
beforeEach(() => Object.assign(state, { pending: false, data: undefined }));
describe("existing card recorded activity presentation", () => {
  it("shows literal returned index, source counts and both exact rolling windows", () => {
    state.data = complete();
    const html = render();
    for (const text of [
      "100/100",
      "Recorded activity index",
      state.data.disclosure,
      state.data.asOf,
      state.data.window.from,
      state.data.comparisonWindow.from,
      "Mail threads (last message time)",
      "2 current; 2 prior",
      "Done Engagement tasks",
      "Planner tasks are excluded",
      "Prior index",
      "includes its start and excludes its end",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("Health score");
  });
  it("displays a genuine complete zero", () => {
    const value = complete();
    value.score = 0;
    value.priorScore = 0;
    value.breakdown = value.priorBreakdown = {
      meetings: 0,
      emails: 0,
      tasksCompleted: 0,
      debriefs: 0,
      outreachSent: 0,
    };
    state.data = value;
    expect(render()).toContain("0/100");
  });
  it.each(["capacity", "changed"] as const)(
    "keeps %s incomplete with null scores and no partial counts",
    (reason) => {
      state.data = {
        ...complete(),
        status: "incomplete",
        reason,
        score: null,
        priorScore: null,
        breakdown: null,
        priorBreakdown: null,
        trend: null,
      };
      const html = render();
      expect(html).toContain("Incomplete");
      expect(html).toContain("no partial total");
      expect(html).not.toContain("0/100");
      expect(html).not.toContain("100/100");
      expect(html).not.toContain("Prior index:");
    },
  );
  it.each([false, true])(
    "shows unavailable/loading without retained counts, pending %s",
    (pending) => {
      state.pending = pending;
      const html = render();
      expect(html).toContain(
        pending ? "Loading recorded activity" : "Recorded activity unavailable",
      );
      expect(html).not.toContain("/100");
      expect(html).not.toContain("Counts and timing");
    },
  );
});
