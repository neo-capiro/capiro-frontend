import { describe, expect, it, vi } from "vitest";
import { handleCapiroRequest } from "./gateway";
import { editorialConfig } from "./operations/legiwatch-editorial";
import { briefingRef } from "./operations/legiwatch-briefings";
import { capiroOperations } from "./registry";

describe("retired LegiWatch surfaces", () => {
  it.each([
    "legiwatch.import.preview",
    "legiwatch.import.apply",
    "legiwatch.research.imports",
    "legiwatch.research.import.decide",
    "legiwatch.report.create",
    "legiwatch.report.update",
    "legiwatch.report.generate",
    "legiwatch.subscriptions",
    "legiwatch.subscription.activation",
    "legiwatch.subscription.run",
    "legiwatch.evidence.news",
    "legiwatch.evidence.monitors",
    "legiwatch.evidence.import.stage",
    "legiwatch.evidence.personnel",
    "legiwatch.evidence.track",
    "legiwatch.evidence.budget",
    "legiwatch.evidence.budget.compare",
    "legiwatch.digest.history",
    "legiwatch.digest.generate",
  ])("rejects %s before authentication or network dispatch", async (key) => {
    const authenticate = vi.fn(async () => "synthetic-token");
    const fetcher = vi.fn();
    const response = await handleCapiroRequest(
      new Request(`https://frontend.example.test/api/capiro/${key}`),
      key,
      capiroOperations,
      { services: {}, authConfigured: true, issues: [] },
      authenticate,
      fetcher,
    );
    expect(response.status).toBe(404);
    expect(authenticate).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps retained delivery and bill rules outside the retired Reports API", () => {
    expect(capiroOperations["legiwatch.delivery.run"].path).toBe(
      "/legiwatch/deliveries/runs/:id",
    );
    expect(capiroOperations["legiwatch.delivery.recipients"].path).toBe(
      "/legiwatch/deliveries/recipients",
    );
    expect(capiroOperations["legiwatch.rules.record"].path).toBe(
      "/legiwatch/monitoring/rules",
    );
    expect(
      Object.values(capiroOperations)
        .filter((operation) => operation.path.startsWith("/legiwatch/reports"))
        .map(({ method, path }) => ({ method, path })),
    ).toEqual([{ method: "GET", path: "/legiwatch/reports" }]);
  });

  it("reviews saved research and briefings without a report-library dependency", () => {
    const research =
      capiroOperations["legiwatch.research.report.preview"].request;
    expect(
      research.safeParse({ body: { selectionId: "selection" } }).success,
    ).toBe(true);
    expect(
      research.safeParse({
        body: { selectionId: "selection", runId: "old-run" },
      }).success,
    ).toBe(false);
    const briefing = capiroOperations["legiwatch.briefing.preview"].request;
    const body = {
      selectionId: "selection",
      audience: "internal",
      acceptSourceGaps: false,
    };
    expect(briefing.safeParse({ body }).success).toBe(true);
    expect(
      briefing.safeParse({ body: { ...body, reportId: "old-report" } }).success,
    ).toBe(true);
  });

  it("accepts only research in new briefing source selections", () => {
    const ref = { id: "source", revision: "revision", locator: "section" };
    expect(briefingRef.safeParse({ ...ref, kind: "research" }).success).toBe(
      true,
    );
    for (const kind of ["news", "budget", "personnel"])
      expect(briefingRef.safeParse({ ...ref, kind }).success).toBe(false);
  });

  it("keeps research schedules while rejecting retired report and monitor configuration", () => {
    const config = {
      folderId: "folder",
      template: "research_update",
      subject: "Research update",
      includedKinds: ["research"],
      schedule: {
        timezone: "UTC",
        hour: 8,
        minute: 0,
        weekdays: [1],
        noChange: "draft",
        sourceGap: "hold",
        mode: "prepare",
      },
      recipientSelection: [],
      prepareEnabled: false,
      sendEnabled: false,
      dictionaryScopeAccepted: true,
      acceptAvailableFields: false,
    };
    expect(editorialConfig.safeParse(config).success).toBe(true);
    for (const extra of [
      { reportId: "report" },
      { monitorIds: [] },
      { categoryMapping: {} },
    ])
      expect(editorialConfig.safeParse({ ...config, ...extra }).success).toBe(
        false,
      );
    expect(
      editorialConfig.safeParse({ ...config, includedKinds: ["news"] }).success,
    ).toBe(false);
    expect(
      editorialConfig.safeParse({ ...config, template: "morning_news_brief" })
        .success,
    ).toBe(false);
  });

  it("rejects the removed bill-report workflow without affecting hearing workflows", () => {
    const request = capiroOperations["legiwatch.workflow.preview"].request;
    const scope = {
      folderIds: ["folder"],
      jurisdiction: "FL",
      sessionKey: "2026",
    };
    expect(
      request.safeParse({
        body: { ...scope, template: "report_review", reportId: "report" },
      }).success,
    ).toBe(false);
    expect(
      request.safeParse({
        body: { ...scope, template: "hearing_preparation", eventId: "hearing" },
      }).success,
    ).toBe(true);
  });
});
