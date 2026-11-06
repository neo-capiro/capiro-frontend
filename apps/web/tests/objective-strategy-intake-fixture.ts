import "./command-recovery-platform";
import { expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { objective as fixtureObjective } from "./browser/fixtures";
import { db, installPlatform } from "./command-recovery-platform";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { createStrategyIntakeRecovery } from "../src/features/portfolio/objectives/objective-strategy-intake-recovery";
import { ObjectiveStrategyIntakeSession } from "../src/features/portfolio/objectives/objective-strategy-intake-session";
import wire from "./objective-generation-wire-fixtures.json";
import type {
  GovernedObjectiveStrategyIntakeRequest,
  GovernedObjectiveStrategyIntakeResponse,
} from "../src/shared/capiro/operations/objective-governed-strategy-intake";
import {
  governedObjectiveGenerationObservation,
  type GovernedObjectiveGenerationObservation,
} from "../src/shared/capiro/operations/objective-governed-generation";

installPlatform();
export const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const actor = {
  tenantId: "synthetic-tenant",
  userId: "synthetic-actor",
};
export const client = { id: id(1), status: "active" };
export const objective = {
  ...fixtureObjective,
  id: id(2),
  clientId: client.id,
  status: "ready" as const,
  version: 7,
  readyAt: "2026-10-17T11:00:00.000Z",
};
export const source = governedObjectiveGenerationObservation.parse({
  schemaVersion: 1,
  clientId: client.id,
  objective: {
    id: objective.id,
    revision: { id: id(3), version: 7 },
    status: "ready",
  },
  workAction: "objective.strategy.draft",
  requestedSource: {
    revision: { id: id(3), version: 7 },
    canonicalBindingVersion: 3,
  },
  control: {
    version: 0,
    currentAuthorizationRequestId: null,
    cancelledAt: null,
  },
  consent: null,
  reconciliation: "outcome_unconfirmed",
  accounting: null,
  commandReceipt: null,
  observedAt: "2026-10-17T12:00:00.000Z",
});

export function setup() {
  const cache = new QueryClient();
  const identity = {
    user: { id: actor.userId, email: null },
    tenant: { id: actor.tenantId, name: "Synthetic" },
    role: "standard_user",
  };
  cache.setQueryData(["identity"], identity);
  const current = { objective, client };
  const control = {
    lostReply: false,
    status: 200,
    role: "standard_user",
    clientStatus: "active",
    objectiveVersion: 7,
    source: structuredClone(source) as GovernedObjectiveGenerationObservation,
    replaceEcho: false,
    lostStart: false,
    wrongRevision: false,
    wrongResult: false,
    complete: false,
    contextFailure: false,
    running: false,
    receiptMismatch: false,
    pause: undefined as Promise<void> | undefined,
  };
  const writes: GovernedObjectiveStrategyIntakeRequest[] = [];
  const receipts = new Map<string, GovernedObjectiveStrategyIntakeResponse>();
  const core: ApiClient = {
    async request(_service, path, schema, options) {
      options?.signal?.throwIfAborted();
      if (path === "me") await control.pause;
      options?.signal?.throwIfAborted();
      const value: unknown =
        path === "me"
          ? { ...identity, role: control.role }
          : path === `clients/${client.id}`
            ? {
                id: client.id,
                name: "Synthetic client",
                profileStatus: "ACTIVE",
                status: control.clientStatus,
              }
            : path === `clients/${client.id}/objectives`
              ? [{ ...objective, version: control.objectiveVersion }]
              : (() => {
                  throw new Error(`Unexpected Core path: ${path}`);
                })();
      return schema.parse(value);
    },
  };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const key = new URL(String(url), "https://example.invalid").pathname;
    if (key.endsWith("/objectives.governedGeneration.read")) {
      const request = JSON.parse(new URL(String(url), "https://example.invalid").searchParams.get("input")!);
      const receipt =
        receipts.get(request.query?.requestId)?.commandReceipt ?? null;
      return Response.json({
        ...control.source,
        commandReceipt:
          receipt && control.receiptMismatch
            ? { ...receipt, payloadDigest: "b".repeat(64) }
            : receipt,
      });
    }
    if (key.endsWith("/strategies.objectiveDraftJob")) {
      const job = structuredClone(
        control.complete ? wire.completedPoll.body : wire.pendingPoll.body,
      );
      const request = JSON.parse(new URL(String(url), "https://example.invalid").searchParams.get("input")!);
      const receipt = [...receipts.values()].find(
        (r) => r.generationJobId === request.params.jobId,
      )!;
      job.jobId = receipt.generationJobId;
      if (control.running) job.status = "running";
      if (control.contextFailure) {
        job.status = "failed";
        job.objectiveGeneration.context.state = "incomplete";
        job.objectiveGeneration.context.issues = [
          {
            group: "target_recommendations",
            code: "REQUIRED_FIELDS_EXCEED_PACKET_BUDGET",
            message: "Required fields do not fit the approved context budget.",
          },
        ];
        job.objectiveGeneration.failure = {
          code: "OBJECTIVE_CONTEXT_INCOMPLETE",
          message:
            "Government relationship context is incomplete. Review its coverage before generating.",
        };
        job.stage = "failed";
        job.errorMessage = job.objectiveGeneration.failure.message;
      }
      if (control.wrongResult && job.objectiveGeneration.result) {
        job.strategyId = id(80);
        job.objectiveGeneration.result.strategyId = id(80);
      }
      job.objectiveGeneration.requestId = receipt.selection.generationRequestId;
      job.objectiveGeneration.source = {
        clientId: client.id,
        objectiveId: objective.id,
        objectiveVersion: 7,
        objectiveRevisionId: control.wrongRevision ? id(99) : id(3),
      };
      return Response.json(job);
    }
    if (!key.endsWith("/objectives.governedStrategy.intake"))
      throw new Error(`Unexpected Capiro operation: ${key}`);
    const request = JSON.parse(
      String(init?.body),
    ) as GovernedObjectiveStrategyIntakeRequest;
    writes.push(request);
    // The browser's encrypted record must precede the first network write.
    expect(db.records.size).toBe(1);
    if (control.status !== 200)
      return Response.json(
        { message: "Synthetic admission held." },
        { status: control.status },
      );
    const replay = receipts.get(request.body.command.requestId);
    if (replay) return Response.json(replay);
    const before = request.body.command.expectedControlVersion;
    const now = Date.parse(control.source.observedAt);
    const receipt: GovernedObjectiveStrategyIntakeResponse = {
      schemaVersion: 2,
      generationJobId: id(20 + receipts.size),
      commandReceipt: {
        schemaVersion: 1,
        receiptId: id(5 + before * 100),
        requestId: request.body.command.requestId,
        payloadDigest: "a".repeat(64),
        clientId: client.id,
        objectiveId: objective.id,
        command: "retry",
        workAction: "objective.strategy.draft",
        commandRevision: source.objective.revision,
        sourceRevision: source.requestedSource.revision,
        rootIntentId: id(6),
        controlVersionBefore: before,
        controlVersionAfter: before + 1,
        targetAuthorizationRequestId:
          request.body.command.targetAuthorizationRequestId,
        authorizationRequestId: id(7 + before * 100),
        consent: {
          id: id(7 + before * 100),
          confirmedAt: new Date(now).toISOString(),
          expiresAt: new Date(now + 900000).toISOString(),
        },
        outcome: "reconsent_recorded",
        committedAt: new Date(now + 1000).toISOString(),
      },
      selection: control.replaceEcho
        ? { ...request.body.selection, type: "coalition" }
        : request.body.selection,
    };
    receipts.set(request.body.command.requestId, receipt);
    control.source = {
      ...control.source,
      control: {
        ...control.source.control,
        version: before + 1,
        currentAuthorizationRequestId:
          receipt.commandReceipt.authorizationRequestId,
      },
      consent: { ...receipt.commandReceipt.consent, expired: false },
      observedAt: new Date(now + 2000).toISOString(),
    };
    if (control.lostReply) {
      control.lostReply = false;
      throw new TypeError("Synthetic lost response");
    }
    return Response.json(receipt);
  });
  const strategy = createCapiroApi(capiroOperations, { fetcher });
  const starts = vi.fn(async (generationJobId: string, signal: AbortSignal) => {
    signal.throwIfAborted();
    const [scope, encrypted] = [...db.records][0]!;
    expect(JSON.stringify(await decryptJournal(scope, encrypted))).toContain(
      '"generationJobId":"' + generationJobId + '"',
    );
    if (control.lostStart) {
      control.lostStart = false;
      throw Error("Start outcome is unconfirmed");
    }
    return { state: "requested" as const, generationJobId };
  });
  const session = () =>
    new ObjectiveStrategyIntakeSession(
      strategy,
      current.objective,
      current.client,
      createStrategyIntakeRecovery(
        core,
        cache,
        actor,
        current.objective,
        () => current,
      ),
      starts,
    );
  const expire = () => {
    control.source.consent!.expired = true;
    control.source.observedAt = new Date(
      Date.parse(control.source.consent!.expiresAt) + 1000,
    ).toISOString();
  };
  return {
    cache,
    current,
    control,
    writes,
    fetcher,
    starts,
    session,
    receipts,
    expire,
  };
}
