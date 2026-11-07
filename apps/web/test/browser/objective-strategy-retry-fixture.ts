import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { fixture } from "./objective-generation-browser-fixtures";
import { json } from "../../tests/browser/fixtures";
import { governedObjectiveGenerationObservation } from "../../src/shared/capiro/operations/objective-governed-generation";
import {
  governedObjectiveStrategyIntakeRequest,
  governedObjectiveStrategyIntakeResponse,
  type GovernedObjectiveStrategyIntakeResponse,
} from "../../src/shared/capiro/operations/objective-governed-strategy-intake";

/** Synthetic server state; real page, public validators and encrypted journal. */
export async function retryFixture(page: Page, failed = false) {
  const f = await fixture(page, { holdGeneration: !failed, failed });
  let current = governedObjectiveGenerationObservation.parse(f.source);
  const receipts = new Map<string, GovernedObjectiveStrategyIntakeResponse>();
  let loseReply = false;
  await page.route(
    "**/api/capiro/objectives.governedGeneration.read?*",
    (route) => {
      const input = JSON.parse(
        new URL(route.request().url()).searchParams.get("input")!,
      );
      return json(route, {
        ...current,
        commandReceipt:
          receipts.get(input.query.requestId)?.commandReceipt ?? null,
      });
    },
  );
  await page.route(
    "**/api/capiro/objectives.governedStrategy.intake",
    (route) => {
      const request = governedObjectiveStrategyIntakeRequest.parse(
        route.request().postDataJSON(),
      );
      const existing = receipts.get(request.body.command.requestId);
      if (existing) {
        f.writes.push(request);
        return json(route, existing);
      }
      const base = f.intake(request),
        before = request.body.command.expectedControlVersion;
      const now = Date.parse(current.observedAt),
        consentId = randomUUID();
      const receipt = governedObjectiveStrategyIntakeResponse.parse({
        ...base,
        generationJobId: receipts.size ? randomUUID() : base.generationJobId,
        commandReceipt: {
          ...base.commandReceipt,
          receiptId: randomUUID(),
          controlVersionBefore: before,
          controlVersionAfter: before + 1,
          targetAuthorizationRequestId:
            request.body.command.targetAuthorizationRequestId,
          authorizationRequestId: consentId,
          consent: {
            id: consentId,
            confirmedAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 900000).toISOString(),
          },
          committedAt: new Date(now + 1000).toISOString(),
        },
      });
      receipts.set(request.body.command.requestId, receipt);
      current = {
        ...current,
        control: {
          version: before + 1,
          currentAuthorizationRequestId: consentId,
          cancelledAt: null,
        },
        consent: { ...receipt.commandReceipt.consent!, expired: false },
        observedAt: new Date(now + 2000).toISOString(),
      };
      if (loseReply) {
        loseReply = false;
        return route.abort("failed");
      }
      return json(route, receipt);
    },
  );
  await page.route("**/api/capiro/strategies.objectiveDraftJob?*", (route) => {
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    const receipt = [...receipts.values()].find(
      (r) => r.generationJobId === input.params.jobId,
    )!;
    const job = f.job();
    job.jobId = receipt.generationJobId;
    job.objectiveGeneration.requestId = receipt.selection.generationRequestId;
    return json(route, job);
  });
  await page.route("**/api/action-followthrough/objective-start", (route) => {
    const body = route.request().postDataJSON();
    f.starts.push(body);
    return route.fulfill({
      status: 202,
      json: { state: "requested", generationJobId: body.generationJobId },
    });
  });
  return {
    ...f,
    receipts,
    loseNextReply() {
      loseReply = true;
    },
    expire() {
      current = {
        ...current,
        consent: { ...current.consent!, expired: true },
        observedAt: new Date(
          Date.parse(current.consent!.expiresAt) + 1000,
        ).toISOString(),
      };
    },
  };
}
