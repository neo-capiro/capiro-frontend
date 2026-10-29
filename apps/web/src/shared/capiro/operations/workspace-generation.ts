import { z } from "zod";
import { defineOperation, requestIdentity } from "../contracts";
import { emptyWorkspaceRequest } from "./workspace-schemas";
import {
  agentContextItem,
  agentDocumentType,
  agentMessage,
  agentProposal,
  agentQualityEvaluation,
  agentRunSummary,
  agentStatus,
  agentTheme,
  blueprintPin,
  briefEditBody,
  conflictResolutionBody,
  documentAgentPhase,
  draftMutation,
  draftParams,
  draftRequest,
  generationMode,
  generationRunStatus,
  intakeBody,
  intakeResponse,
  nativeGenerationRequest,
  nativeGenerationResponse,
  nativeGenerationRunRequest,
  nativeGenerationRunResponse,
  outlineEditBody,
  revision,
  revisionBody,
  runParams,
  runRetryResponse,
  stateResponse,
} from "./workspace-generation-schemas";

// WS-22 consumer operations for the Workspace Document Agent, served by
// `apps/workspace` under /workspace-api.
//
// The five supported generated phases (brief/synthesize, context/recommend,
// context/analyze, outline/generate, generate) are now served by the approved
// greenfield Meri native conversation owner: the Workspace route issues ONE
// canonical native turn through `document-agent/native-generation.bridge.ts` and
// admits the result through the existing Workspace state/revision/approval
// owners. Each of the five phase BODIES declares the explicit intent as the
// closed field `paidGeneration: true` (the document-agent DTOs are closed and the
// workspace ValidationPipe forbids non-whitelisted fields, so a missing intent, a
// `false` intent or an extra field is refused); no paid phase declares or sends a
// request header. `Idempotency-Key` is declared by exactly one operation, the
// durable intake POST below, and stays that request's identity channel alone.
//
// Still withheld (they would activate the legacy MeriV3/provider handler and
// have no approved greenfield owner): recommend, message send and generation
// retry. Their exact routes, body contracts and required greenfield owner are
// recorded in features/modules/workspace/generation/README.md. `runs/retry-failed`
// is no longer among them: it is served by the same approved durable-intake owner
// as the intake and the run read (see the run continuation operation below).
const source =
  "capiro-backend@b442ab6 apps/workspace/src/document-agent/{document-agent.controller,document-agent.service,document-agent-quality.service,dto/document-agent.dto,native-generation.bridge}.ts; quick-draft/{two-step-draft.controller,intake.service,generation-run-worker.service,dto/intake.dto}.ts";

export const workspaceGenerationOperations = {
  "workspace.generation.catalog": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/document-agent/catalog",
    request: emptyWorkspaceRequest,
    response: z.strictObject({ documentTypes: z.array(agentDocumentType) }),
    source,
  }),
  "workspace.generation.state": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/agent",
    request: draftRequest,
    response: stateResponse,
    source,
  }),
  "workspace.generation.initialize": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/initialize",
    request: z.strictObject({
      params: draftParams,
      body: z.strictObject({
        documentType: agentDocumentType.optional(),
        blueprintPin: blueprintPin.optional(),
        theme: agentTheme.optional(),
        goal: z.string().optional(),
      }),
    }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.patch": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/drafts/:draftId/agent",
    request: z.strictObject({
      params: draftParams,
      body: z.strictObject({
        expectedRevision: revision,
        documentType: agentDocumentType.optional(),
        blueprintPin: z.record(z.string(), z.unknown()).optional(),
        theme: z.record(z.string(), z.unknown()).optional(),
        goal: z.record(z.string(), z.unknown()).optional(),
        generation: z
          .strictObject({ mode: generationMode.optional() })
          .optional(),
        phase: documentAgentPhase.optional(),
        status: agentStatus.optional(),
      }),
    }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.messages": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/agent/messages",
    request: draftRequest,
    response: z.strictObject({ messages: z.array(agentMessage) }),
    source,
  }),
  "workspace.generation.brief.update": defineOperation({
    service: "workspace",
    method: "PUT",
    path: "/drafts/:draftId/agent/brief",
    request: z.strictObject({ params: draftParams, body: briefEditBody }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.brief.approve": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/brief/approve",
    request: draftMutation,
    response: stateResponse,
    source,
  }),
  // Served by the approved greenfield Meri native owner. The paid-generation
  // intent is a truthful field of the request body (`paidGeneration: true`), so
  // an ordinary caller can never start a paid run by accident and no ordinary
  // header is borrowed to mean something else.
  "workspace.generation.brief.synthesize": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/brief/synthesize",
    request: nativeGenerationRequest,
    response: nativeGenerationResponse,
    source,
  }),
  "workspace.generation.context.recommend": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/context/recommend",
    request: nativeGenerationRequest,
    response: nativeGenerationResponse,
    source,
  }),
  "workspace.generation.context.analyze": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/context/analyze",
    request: nativeGenerationRequest,
    response: nativeGenerationResponse,
    source,
  }),
  "workspace.generation.outline.generate": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/outline/generate",
    request: nativeGenerationRequest,
    response: nativeGenerationResponse,
    source,
  }),
  "workspace.generation.generate": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/generate",
    request: nativeGenerationRunRequest,
    response: nativeGenerationRunResponse,
    source,
  }),
  // The DOCUMENT failed-unit retry: the SAME retained native request owner a first
  // document turn uses, entered again for the run's own failed units, landing them as
  // an existing pending `content_revision` proposal. `intent` is required here — this
  // operation only ever starts a new paid native attempt, so it has no un-intended
  // variant to protect — and it is also what makes the route refuse a run that
  // carries no retained native request BEFORE either dispatcher is consulted.
  "workspace.generation.document.retry": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/generation/retry",
    request: z.strictObject({
      params: draftParams,
      body: z.strictObject({
        expectedRevision: revision,
        sectionIds: z.array(z.string().min(1)).min(1).max(64).optional(),
        intent: z.literal("retry-failed-units"),
      }),
    }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.brief.reopen": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/brief/reopen",
    request: draftMutation,
    response: stateResponse,
    source,
  }),
  "workspace.generation.context.approve": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/context/approve",
    request: draftMutation,
    response: stateResponse,
    source,
  }),
  "workspace.generation.context.resolve": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/context/resolve",
    request: z.strictObject({
      params: draftParams,
      body: conflictResolutionBody,
    }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.context.item": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/drafts/:draftId/context/:itemId",
    request: z.strictObject({
      params: draftParams.extend({ itemId: z.uuid() }).strict(),
      body: z.strictObject({
        payload: z.record(z.string(), z.unknown()),
        expectedRevision: revision.optional(),
      }),
    }),
    response: z.strictObject({ item: agentContextItem }),
    source,
  }),
  "workspace.generation.outline.update": defineOperation({
    service: "workspace",
    method: "PUT",
    path: "/drafts/:draftId/agent/outline",
    request: z.strictObject({ params: draftParams, body: outlineEditBody }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.outline.revise": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/outline/revise",
    request: z.strictObject({
      params: draftParams,
      body: z.strictObject({
        expectedRevision: revision,
        instruction: z.string().min(1),
      }),
    }),
    response: z.strictObject({
      proposal: z.strictObject({ proposalId: z.string().min(1) }),
    }),
    source,
  }),
  "workspace.generation.outline.approve": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/outline/approve",
    request: draftMutation,
    response: stateResponse,
    source,
  }),
  "workspace.generation.proposals": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/agent/proposals",
    request: draftRequest,
    response: z.strictObject({ proposals: z.array(agentProposal) }),
    source,
  }),
  "workspace.generation.proposal.accept": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/proposals/:proposalId/accept",
    request: z.strictObject({
      params: draftParams.extend({ proposalId: z.uuid() }).strict(),
      body: revisionBody,
    }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.proposal.reject": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/proposals/:proposalId/reject",
    request: z.strictObject({
      params: draftParams.extend({ proposalId: z.uuid() }).strict(),
      body: z.strictObject({
        expectedRevision: revision,
        note: z.string().optional(),
      }),
    }),
    response: stateResponse,
    source,
  }),
  "workspace.generation.status": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/agent/generation",
    request: draftRequest,
    response: z.strictObject({ run: agentRunSummary.nullable() }),
    source,
  }),
  "workspace.generation.cancel": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/generation/cancel",
    request: draftMutation,
    response: stateResponse,
    source,
  }),
  "workspace.generation.quality": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/agent/quality",
    request: draftRequest,
    response: agentQualityEvaluation,
    source,
  }),
  "workspace.generation.quality.fix": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/agent/quality/issues/:issueId/fix",
    request: z.strictObject({
      params: draftParams
        .extend({ issueId: z.string().min(1).max(200) })
        .strict(),
      body: z.strictObject({
        expectedRevision: revision,
        instruction: z.string().optional(),
      }),
    }),
    response: z.strictObject({ proposalId: z.string().min(1) }),
    source,
  }),
  "workspace.generation.intake.capability": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/document-agent/two-step-draft-capability",
    request: emptyWorkspaceRequest,
    response: z.strictObject({ enabled: z.boolean() }),
    source,
  }),
  "workspace.generation.run.status": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/document-agent/runs/:runId/status",
    request: z.strictObject({ params: runParams }),
    response: generationRunStatus,
    source,
  }),
  // The continuation of ONE durable run, served by the same approved owner as the
  // intake and the run read. For a run a durable intake created, the worker
  // re-reads/replays the SAME RETAINED native request with the caller's own
  // current credential and never reaches the legacy provider owner; a run that is
  // not a durable intake still hands its work to the legacy owner there, which is
  // why this surface only ever builds the request from its own current receipt.
  //
  // The body carries ONE closed field: the native-only workflow marker. It
  // selects the route's native workflow, so a run the durable-intake owner did
  // not create is refused there instead of reaching the legacy owner - a browser
  // receipt is untrusted and can never enforce that boundary by itself. The
  // marker is a workflow selector, not authority: it grants nothing, carries no
  // status, secret or scan result, and the route still applies its own tenant,
  // acting-actor and edit-ACL checks. No request header and no request identity:
  // the receipt correlates, it is not an identity, and nothing here mints a new
  // one. Activation is per surface - see `generation/owner-map.ts`.
  "workspace.generation.run.retryFailed": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/document-agent/runs/:runId/retry-failed",
    request: z.strictObject({
      params: runParams,
      // `intent` is the deliberate paid form: the caller acknowledges that the
      // units this run failed may generate again. It is optional and closed, so a
      // caller that only checks/re-reads the retained request cannot send it by
      // accident, and the route's own worker refuses any other value.
      body: z.strictObject({
        workflow: z.literal("native-retained"),
        intent: z.literal("retry-failed-units").optional(),
      }),
    }),
    response: runRetryResponse,
    source,
  }),
  // Requires an `Idempotency-Key` request header: the contract declares the one
  // header the route needs and the gateway forwards exactly it from the
  // request's `idempotencyKey` (an untrusted request identity, never auth or
  // scope). Activation is withheld - see `generation/owner-map.ts`.
  "workspace.generation.intake": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/document-agent/intakes",
    idempotency: "Idempotency-Key",
    request: z.strictObject({
      body: intakeBody,
      idempotencyKey: requestIdentity,
    }),
    response: intakeResponse,
    source,
  }),
};
