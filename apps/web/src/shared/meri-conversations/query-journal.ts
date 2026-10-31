import {
  researchSelection,
  sameResearchCapture,
  type ResearchSelection,
} from "./research-context";
import type { ConversationContext } from "./session";
import type { QueryClient } from "@tanstack/react-query";
import type { MeriConversationSnapshot } from "@capiro/meri-client/conversation";
import {
  receiveConversationRequest,
  type ConversationStoredRequest,
  type ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import { actionUuid } from "../meri-actions/session-receipt";
import { z } from "zod";
import {
  tabRecord,
  TabJournalUnavailable,
  TabJournalRetired,
  type TabStorage,
} from "./tab-journal";
export type ConversationIntent = Readonly<{
  submit?: Readonly<
    ConversationDraftRequest & {
      state: "pending" | "unknown" | "observed";
      /** Local recovery route only; omitted from canonical request bytes. */
      workflow?: "initial";
    }
  >;
  cancel?: "pending" | "unknown" | "observed";
}>;

/**
 * Every explicit unsent selection. `work` is the canonical frozen member of the successor contract:
 * naming it through the contract keeps the shell honest, while `Pick` alone would make it a required
 * key and force every partial selection literal in the app to restate it.
 *
 * The two ordered lists are held as plain mutable string lists here because the generated contract
 * types them as a maxItems tuple union, which cannot express a selection still being assembled. The
 * canonical public receiver is what validates the final lists; the shell never admits a request.
 */
type WorkMember = NonNullable<ConversationSubmitRequest["work"]>;
export type SelectedWork = Omit<WorkMember, "deliverables" | "dependencies"> & {
  deliverables: string[];
  dependencies: string[];
};
/**
 * The unsent draft shape: the canonical request with the ordered work lists still ordinary arrays,
 * because a selection still being assembled cannot satisfy the generated maxItems tuple. Editing,
 * journal and persistence state hold this shape; only the public receiver turns a draft into the
 * bounded canonical request, and only the admitted request is dispatched.
 */
export type ConversationDraftRequest = Omit<
  ConversationSubmitRequest,
  "work"
> & {
  work?: SelectedWork;
};
export type ConversationSkillSelection = Pick<
  ConversationSubmitRequest,
  "skill" | "windowRequest" | "documentRevision" | "procedure" | "siteWorkflow"
> & {
  work?: SelectedWork;
};

/** Preserve exact selected inputs independently of mutable picker objects. */
export function skillSelectionFields(input: ConversationSkillSelection) {
  const copy = structuredClone({
    ...(input.skill ? { skill: input.skill } : {}),
    ...(input.windowRequest ? { windowRequest: input.windowRequest } : {}),
    // A native procedure is one exact closed selector: source, id, version and Core's digest.
    ...(input.procedure ? { procedure: { ...input.procedure } } : {}),
    ...(input.siteWorkflow ? { siteWorkflow: { ...input.siteWorkflow } } : {}),
    ...(input.documentRevision
      ? { documentRevision: input.documentRevision }
      : {}),
    // A work definition is an exact ordered pair of lists, never a picker object.
    ...(input.work
      ? {
          work: {
            entry: input.work.entry,
            jobKind: input.work.jobKind,
            deliverables: [...input.work.deliverables],
            dependencies: [...input.work.dependencies],
          },
        }
      : {}),
  });
  if (copy.skill) Object.freeze(copy.skill);
  if (copy.documentRevision) Object.freeze(copy.documentRevision);
  if (copy.windowRequest) Object.freeze(copy.windowRequest);
  if (copy.procedure) Object.freeze(copy.procedure);
  if (copy.siteWorkflow) Object.freeze(copy.siteWorkflow);
  if (copy.work) {
    Object.freeze(copy.work.deliverables);
    Object.freeze(copy.work.dependencies);
    Object.freeze(copy.work);
  }
  return Object.freeze(copy);
}

/** Reuse the public request receiver for draft fields; this local shell is never dispatched. */
export function receiveSkillSelection(value: unknown) {
  const fields = z
    .strictObject({
      skill: z.unknown().optional(),
      windowRequest: z.unknown().optional(),
      documentRevision: z.unknown().optional(),
      procedure: z.unknown().optional(),
      siteWorkflow: z.unknown().optional(),
      work: z.unknown().optional(),
    })
    .parse(value);
  return skillSelectionFields(
    receiveConversationRequest(
      "submit",
      new TextEncoder().encode(
        JSON.stringify({
          requestId: "00000000-0000-4000-8000-000000000000",
          prompt: "Unsent draft selection",
          ...fields,
        }),
      ),
    ),
  );
}

/**
 * Adopt the handoff's own admitted revision selection into the current one. The revision keeps every
 * other admitted selected input — the Work definition, the requested window — and replaces only a
 * skill pin the canonical receiver refuses beside it, rather than carrying an invalid pair forward.
 * The receiver decides that, so the eligible skill identities are never restated here.
 */
export function withDocumentRevision(
  selection: ConversationSkillSelection,
  revision: ConversationSkillSelection,
): ConversationSkillSelection {
  const beside = { ...selection, ...revision };
  try {
    return receiveSkillSelection(beside);
  } catch {
    const replaced = { ...beside };
    delete replaced.skill;
    return receiveSkillSelection(replaced);
  }
}

/** Removing a revision is one choice, not all of them: every other admitted input stays selected. */
export function withoutDocumentRevision(
  selection: ConversationSkillSelection,
): ConversationSkillSelection {
  const next = { ...selection };
  delete next.documentRevision;
  return receiveSkillSelection(next);
}

/**
 * Choosing (or clearing) the native procedure is one choice. The canonical submit contract makes the
 * static quick-skill pin and the native procedure mutually exclusive, so a procedure replaces a
 * selected skill pin while every other admitted input stays selected. The receiver decides — nothing
 * here restates eligibility — and a combination it still refuses is refused here, never carried into
 * the draft.
 */
export function withProcedureSelection(
  selection: ConversationSkillSelection,
  procedure: ConversationSkillSelection["procedure"],
): ConversationSkillSelection {
  const beside = { ...selection, procedure };
  if (!procedure) {
    delete beside.procedure;
    return receiveSkillSelection(beside);
  }
  try {
    return receiveSkillSelection(beside);
  } catch {
    const replaced = { ...beside };
    delete replaced.skill;
    return receiveSkillSelection(replaced);
  }
}

/**
 * Recover the original requested window, skill and attachment selection, never the normalized
 * execution window: the stored uploads echo is what a recovered message re-sends unchanged.
 */
export function storedSubmission(
  stored: ConversationStoredRequest,
): ConversationSubmitRequest {
  return receiveConversationRequest(
    "submit",
    new TextEncoder().encode(
      JSON.stringify({
        requestId: stored.requestId,
        // The stored procedure selector is re-sent unchanged — same source, id, version and digest.
        ...(stored.procedure ? { procedure: { ...stored.procedure } } : {}),
        ...(stored.siteWorkflow
          ? { siteWorkflow: { ...stored.siteWorkflow } }
          : {}),
        ...(stored.documentRevision
          ? { documentRevision: stored.documentRevision }
          : {}),
        prompt: stored.prompt,
        ...(stored.modelSelection
          ? { modelSelection: stored.modelSelection }
          : {}),
        ...(stored.uploads ? { uploads: stored.uploads } : {}),
        ...(stored.windowRequest
          ? { windowRequest: stored.windowRequest }
          : {}),
        ...(stored.skill
          ? {
              skill: {
                skillId: stored.skill.skillId,
                skillVersion: stored.skill.skillVersion,
              },
            }
          : {}),
        // The stored work definition is re-sent unchanged, list order included.
        ...(stored.work
          ? {
              work: {
                entry: stored.work.entry,
                jobKind: stored.work.jobKind,
                deliverables: [...stored.work.deliverables],
                dependencies: [...stored.work.dependencies],
              },
            }
          : {}),
      }),
    ),
  );
}

/**
 * Pure identity over a draft or an admitted request: it reads no field, constructs nothing and
 * grants nothing. A canonical request is assignable to the draft shape it is compared against.
 */
export const submissionIdentity = (input: ConversationDraftRequest) =>
  JSON.stringify(input, (_, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );

function snapshotSubmit(submit: NonNullable<ConversationIntent["submit"]>) {
  const copy = structuredClone(submit);
  if (copy.siteWorkflow) Object.freeze(copy.siteWorkflow);
  if (copy.windowRequest) Object.freeze(copy.windowRequest);
  if (copy.procedure) Object.freeze(copy.procedure);
  if (copy.skill) Object.freeze(copy.skill);
  if (copy.documentRevision) Object.freeze(copy.documentRevision);
  if (copy.modelSelection) Object.freeze(copy.modelSelection);
  if (copy.work) {
    Object.freeze(copy.work.deliverables);
    Object.freeze(copy.work.dependencies);
    Object.freeze(copy.work);
  }
  // A retained attachment reference is an exact id and digest, frozen like every other field.
  if (copy.uploads) for (const upload of copy.uploads) Object.freeze(upload);
  return Object.freeze(copy);
}
/** Only canonical request fields and local uncertainty survive reload; no receipt grants authority. */
function receiveIntent(value: unknown): ConversationIntent {
  const raw = z
    .strictObject({
      submit: z.unknown().optional(),
      cancel: z.enum(["pending", "unknown", "observed"]).optional(),
    })
    .parse(value);
  if (raw.submit === undefined) return raw as ConversationIntent;
  const { state, workflow, ...input } = raw.submit as Record<string, unknown>;
  z.enum(["pending", "unknown", "observed"]).parse(state);
  z.literal("initial").optional().parse(workflow);
  const request = receiveConversationRequest(
    "submit",
    new TextEncoder().encode(JSON.stringify(input)),
  );
  return {
    ...raw,
    submit: {
      ...request,
      state: "unknown",
      ...(workflow ? { workflow: "initial" } : {}),
    },
  };
}

/** Completed input history does not settle an unresolved cancellation. */
export function retirableConversationRequestId(value: unknown) {
  const intent = receiveIntent(value);
  if (
    !intent.submit ||
    intent.cancel === "pending" ||
    intent.cancel === "unknown"
  )
    throw new TabJournalUnavailable();
  return intent.submit.requestId;
}

/** Nonsecret command uncertainty follows this exact observed context in same-tab recovery. */
export function conversationIntentJournal(
  client: QueryClient,
  context: ConversationContext,
  storage?: TabStorage,
) {
  const key = [
    "meri-conversation-intent",
    context.tenantId,
    context.actorId,
    context.conversationId,
    context.runId,
    context.selectedClientId,
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  let persistence: ReturnType<typeof tabRecord<ConversationIntent>> | undefined;
  let recoveryBlocked = false;
  let retiredRequestId: string | undefined;
  let recovered: ConversationIntent = {};
  try {
    persistence = tabRecord(
      { ...context, clientId: context.selectedClientId },
      "request",
      receiveIntent,
      context.runId,
      storage ?? null,
    );
    recovered = persistence.read() ?? {};
    if (recovered.cancel) recovered = { ...recovered, cancel: "unknown" };
  } catch (error) {
    recoveryBlocked = true;
    if (error instanceof TabJournalRetired) retiredRequestId = error.requestId;
  }
  client.setQueryData<ConversationIntent>(
    key,
    (previous) => previous ?? recovered,
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    !recoveryBlocked &&
    (persistence?.current() ?? true) &&
    owned !== undefined &&
    cache.find({ queryKey: key, exact: true }) === owned;
  return {
    current,
    get recoveryBlocked() {
      return recoveryBlocked;
    },
    /** Only this freshly authorized port's admitted, completed history can resolve retirement.
     * It does not restore the old draft, assume non-delivery, or dispatch a command. */
    acknowledgeCompletedRetirement(port: {
      context: ConversationContext;
      getSnapshot: () => MeriConversationSnapshot;
    }) {
      if (
        !retiredRequestId ||
        !persistence?.current() ||
        cache.find({ queryKey: key, exact: true }) !== owned
      )
        return false;
      const next = port.context;
      if (
        next.tenantId !== context.tenantId ||
        next.actorId !== context.actorId ||
        next.selectedClientId !== context.selectedClientId ||
        next.conversationId !== context.conversationId ||
        next.runId !== context.runId
      )
        return false;
      const snapshot = port.getSnapshot();
      if (
        snapshot.status !== "ready" ||
        snapshot.observation?.runState !== "completed" ||
        !snapshot.acceptedRequest ||
        snapshot.acceptedRequest.requestId !== retiredRequestId ||
        snapshot.submit === "pending" ||
        snapshot.submit === "unknown" ||
        snapshot.cancel === "pending" ||
        snapshot.cancel === "unknown"
      )
        return false;
      const submit = {
        ...storedSubmission(snapshot.acceptedRequest),
        state: "observed" as const,
      };
      // A fresh record write keeps the same generation fence and storage verification as every command.
      persistence.write({ submit });
      client.setQueryData(
        key,
        Object.freeze({ submit: snapshotSubmit(submit) }),
      );
      retiredRequestId = undefined;
      recoveryBlocked = false;
      return true;
    },
    read(): ConversationIntent {
      if (!current()) return {};
      const value = client.getQueryData<ConversationIntent>(key) ?? {};
      return {
        ...value,
        ...(value.submit?.state === "pending"
          ? { submit: { ...value.submit, state: "unknown" as const } }
          : {}),
        ...(value.cancel === "pending" ? { cancel: "unknown" as const } : {}),
      };
    },
    write(value: ConversationIntent) {
      if (recoveryBlocked || (persistence && !persistence.current()))
        throw new TabJournalUnavailable();
      if (current()) {
        persistence?.write(value);
        client.setQueryData(
          key,
          Object.freeze({
            ...value,
            ...(value.submit ? { submit: snapshotSubmit(value.submit) } : {}),
          }),
        );
        return true;
      }
      return false;
    },
  };
}

/** Reopening constrains issuance to the last observed run; a failed rebind never chooses another. */
export function conversationSelectionOwner(
  client: QueryClient,
  account: { tenantId: string; actorId: string },
  clientId: string | null,
  conversationId?: string,
  storage?: TabStorage,
  research?: ResearchSelection,
) {
  const captured = research
    ? researchSelection(account, research.conversationId, research.scope)
    : undefined;
  if (
    captured &&
    (clientId !== null || conversationId !== captured.conversationId)
  )
    throw new TabJournalUnavailable();
  const key = [
    "meri-conversation-selection",
    account.tenantId,
    account.actorId,
    clientId,
    ...(conversationId ? [conversationId] : []),
    ...(captured ? [captured.scopeKind, captured.scope] : []),
  ];
  client.setQueryDefaults(key, { gcTime: Infinity });
  const persistence = tabRecord(
    { ...account, clientId, conversationId: conversationId ?? "" },
    "selection",
    (value) => {
      const selected = z
        .strictObject({ conversationId: actionUuid, runId: actionUuid })
        .parse(value);
      if (conversationId && selected.conversationId !== conversationId)
        throw new TabJournalUnavailable();
      return selected;
    },
    captured ? `research:${JSON.stringify(captured.scope)}` : "",
    storage ?? null,
  );
  const recovered = persistence.read();
  client.setQueryData<{ conversationId?: string; runId?: string }>(
    key,
    (previous) =>
      previous ?? recovered ?? (conversationId ? { conversationId } : {}),
  );
  const cache = client.getQueryCache(),
    owned = cache.find({ queryKey: key, exact: true });
  const current = () =>
    persistence.current() &&
    owned !== undefined &&
    cache.find({ queryKey: key, exact: true }) === owned;
  const remembered =
    client.getQueryData<{ conversationId?: string; runId?: string }>(key) ?? {};
  return {
    hints: captured
      ? { ...remembered, clientId: null, ...captured }
      : { ...remembered, clientId },
    record(context: ConversationContext) {
      if (
        captured
          ? !("scopeKind" in context) ||
            context.scopeKind !== "research_portfolio" ||
            !sameResearchCapture(captured.scope, context.scope)
          : "scopeKind" in context && context.scopeKind === "research_portfolio"
      )
        throw new TabJournalUnavailable();
      if (
        context.tenantId !== account.tenantId ||
        context.actorId !== account.actorId ||
        context.selectedClientId !== clientId ||
        (conversationId && context.conversationId !== conversationId)
      )
        throw new TabJournalUnavailable();
      if (current()) {
        persistence.write({
          conversationId: context.conversationId,
          runId: context.runId,
        });
        client.setQueryData(
          key,
          Object.freeze({
            conversationId: context.conversationId,
            runId: context.runId,
          }),
        );
      }
    },
  };
}
