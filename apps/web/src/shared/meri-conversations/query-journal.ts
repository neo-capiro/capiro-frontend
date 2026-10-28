import type { ConversationContext } from "./session";
import type { QueryClient } from "@tanstack/react-query";
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
export type ConversationDraftRequest = Omit<ConversationSubmitRequest, "work"> & {
  work?: SelectedWork;
};
export type ConversationSkillSelection = Pick<
  ConversationSubmitRequest,
  "skill" | "windowRequest" | "documentRevision"
> & {
  work?: SelectedWork;
};

/** Preserve exact selected inputs independently of mutable picker objects. */
export function skillSelectionFields(input: ConversationSkillSelection) {
  const copy = structuredClone({
    ...(input.skill ? { skill: input.skill } : {}),
    ...(input.windowRequest ? { windowRequest: input.windowRequest } : {}),
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
  if (copy.windowRequest) Object.freeze(copy.windowRequest);
  if (copy.skill) Object.freeze(copy.skill);
  if (copy.documentRevision) Object.freeze(copy.documentRevision);
  if (copy.modelSelection) Object.freeze(copy.modelSelection);
  if (copy.work) {
    Object.freeze(copy.work.deliverables);
    Object.freeze(copy.work.dependencies);
    Object.freeze(copy.work);
  }
  // A retained attachment reference is an exact id and digest, frozen like every other field.
  if (copy.uploads)
    for (const upload of copy.uploads) Object.freeze(upload);
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
  } catch {
    recoveryBlocked = true;
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
    recoveryBlocked,
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
) {
  const key = [
    "meri-conversation-selection",
    account.tenantId,
    account.actorId,
    clientId,
    ...(conversationId ? [conversationId] : []),
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
    "",
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
    hints: { ...remembered, clientId },
    record(context: ConversationContext) {
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
