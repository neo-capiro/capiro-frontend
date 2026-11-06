import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ObjectiveGenerationOutcome } from "../src/features/portfolio/objectives/ObjectiveGeneration";
import { objectiveGenerationJob } from "../src/shared/capiro/operations/objective-generation";
import wire from "./objective-generation-wire-fixtures.json";

vi.mock(
  "../src/features/portfolio/objectives/ObjectivePlannerAutomation",
  () => ({
    ObjectivePlannerAutomation: () =>
      createElement("div", { "data-planner-consent": "separate" }),
  }),
);
const actor = { tenantId: "tenant-synthetic", userId: "user-synthetic" };

it("completed generation opens the existing working Strategy and preserves exact saved review separately", () => {
  const job = objectiveGenerationJob.parse(wire.completedPoll.body);
  const html = renderToStaticMarkup(
    createElement(ObjectiveGenerationOutcome, { job, actor }),
  );
  const { source, result } = job.objectiveGeneration;
  expect(html).toContain(
    `href="/modules/strategies?clientId=${source.clientId}&amp;strategy=${result!.strategyId}"`,
  );
  expect(html).toContain("Open in Strategies");
  expect(html).toContain("Review generated version");
  expect(html).toContain(`strategyVersionId=${result!.strategyVersionId}`);
  expect(html).toContain(`generatedJobId=${job.jobId}`);
  expect(html).toContain("data-planner-consent");
});

it.each([wire.pendingPoll.body, wire.incompleteContextPoll.body])(
  "withholds all output navigation and Planner preparation for $status generation",
  (value) => {
    const job = objectiveGenerationJob.parse(value);
    const html = renderToStaticMarkup(
      createElement(ObjectiveGenerationOutcome, { job, actor }),
    );
    expect(html).not.toContain("Open in Strategies");
    expect(html).not.toContain("Review generated version");
    expect(html).not.toContain("data-planner-consent");
  },
);
