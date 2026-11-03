import { z } from "zod";
import type { RunBinding } from "@capiro/meri-contracts";
import { receiveConversationRequest } from "@capiro/meri-contracts/conversation-application";
import { receiveConversationHistoryRequest } from "@capiro/meri-contracts/conversation-history";
import {
  skillSelectionFields,
  type ConversationDraftRequest,
} from "./query-journal";
import {
  tabRecord,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "./tab-journal";

const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
function receiveTurn(value: unknown) {
  const local = z
    .strictObject({ source: z.unknown(), request: z.unknown() })
    .parse(value);
  return {
    source: receiveConversationHistoryRequest("nextTurn", bytes(local.source)),
    request: receiveConversationRequest("submit", bytes(local.request)),
  };
}

/** Persist requests, never reservation receipts. Explicit recovery must re-read the mapping. */
export function persistedTurn(scope: TabScope, storage?: TabStorage) {
  const record = tabRecord(
    scope,
    "turn",
    (value) => {
      const received = receiveTurn(value);
      if (received.source.conversationId !== scope.conversationId)
        throw new TabJournalUnavailable();
      return received;
    },
    "",
    storage ?? null,
  );
  return {
    current: record.current,
    clear() {
      record.clear();
      if (record.read() !== undefined) throw new TabJournalUnavailable();
    },
    read() {
      const value = record.read();
      return value
        ? {
            source: {
              tenantId: scope.tenantId,
              actorId: scope.actorId,
              conversationId: value.source.conversationId,
              runId: value.source.sourceRunId,
            },
            ...value.request,
            state: "unknown" as const,
          }
        : undefined;
    },
    /** The retained draft is admitted by the public receiver here, never stored as a local shape. */
    write(
      intent: ConversationDraftRequest & {
        source: Pick<
          RunBinding,
          "tenantId" | "actorId" | "conversationId" | "runId"
        >;
      },
    ) {
      if (!storage) return;
      if (
        intent.source.tenantId !== scope.tenantId ||
        intent.source.actorId !== scope.actorId
      )
        throw new TabJournalUnavailable();
      record.write(
        receiveTurn({
          source: {
            conversationId: intent.source.conversationId,
            sourceRunId: intent.source.runId,
          },
          request: {
            requestId: intent.requestId,
            prompt: intent.prompt,
            ...skillSelectionFields(intent),
            ...(intent.uploads ? { uploads: intent.uploads } : {}),
            ...(intent.modelSelection
              ? { modelSelection: intent.modelSelection }
              : {}),
          },
        }),
      );
    },
  };
}

/** Corrupt or unavailable storage closes mutation recovery instead of inventing a fresh intent. */
export function recoverPersistedTurn(scope: TabScope, storage?: TabStorage) {
  try {
    const record = persistedTurn(scope, storage);
    return { record, intent: record.read(), blocked: false };
  } catch {
    return { record: undefined, intent: undefined, blocked: true };
  }
}

/** What this tab may hold for one reservation: an answer, or the tombstone that retired it. */
type OpenedReservation =
  | Readonly<{ retired: true }>
  | Readonly<{
      source: Readonly<{ conversationId: string; sourceRunId: string }>;
      targetRunId: string;
    }>;

/** The durable half of the answer, in its own record: a later owner can retire it without the answer. */
type OpenedClaim =
  | Readonly<{ state: "retired" }>
  | Readonly<{
      state: "confirmed";
      sourceRunId: string;
      targetRunId: string;
    }>;

/**
 * The next reservation control itself confirmed admitted no message, from this tab. The saved read
 * cannot settle it: one immutable target per source keeps the reservation row after the check, so
 * every later page still reports it. Only this tab's own answer is kept, and only for the exact
 * source and target Core bound.
 *
 * The answer is only trusted while its claim record agrees with it. The claim lives in its own
 * record, so retirement is durable even for a tab that cannot rewrite or delete the answer, and an
 * unreadable answer or claim is never read as "nothing was sent".
 */
export function persistedOpenedReservation(
  scope: TabScope,
  storage?: TabStorage,
) {
  const answer = tabRecord<OpenedReservation>(
    scope,
    "turn-open",
    (value) => receiveOpenedReservation(scope, value),
    "",
    storage ?? null,
  );
  const claim = tabRecord<OpenedClaim>(
    scope,
    "turn-claim",
    (value) => receiveOpenedClaim(value),
    "open-claim",
    storage ?? null,
  );
  const readAnswer = ():
    | { sourceRunId: string; targetRunId: string }
    | undefined => {
    const value = answer.read();
    return value && "source" in value
      ? {
          sourceRunId: value.source.sourceRunId,
          targetRunId: value.targetRunId,
        }
      : undefined;
  };
  const read = (): { sourceRunId: string; targetRunId: string } | undefined => {
    try {
      const kept = readAnswer();
      const held = claim.read();
      return kept &&
        held?.state === "confirmed" &&
        held.sourceRunId === kept.sourceRunId &&
        held.targetRunId === kept.targetRunId
        ? kept
        : undefined;
    } catch {
      // An answer or claim this page cannot read proves nothing about the message.
      return undefined;
    }
  };
  const write = (target: { sourceRunId: string; targetRunId: string }) => {
    if (!storage) return;
    claim.write({ state: "confirmed", ...target });
    if (claim.read()?.state !== "confirmed") throw new TabJournalUnavailable();
    answer.write({
      source: {
        conversationId: scope.conversationId,
        sourceRunId: target.sourceRunId,
      },
      targetRunId: target.targetRunId,
    });
  };
  /**
   * Retirement is a durable fact, not a caught assumption, and each way of making it durable is
   * attempted on its own: a write that cannot allocate (quota) must not skip a removal that works.
   * Nothing is written when there is no answer or claim to retire, so a conversation that was never
   * confirmed leaves no record behind. Returns whether the retirement was verified.
   */
  const retire = () => {
    let pending = true;
    try {
      pending = readAnswer() !== undefined || claim.read() !== undefined;
    } catch {
      /* Unreadable: attempt retirement rather than assume it was never written. */
    }
    if (!pending) return true;
    let retired = false;
    try {
      claim.write({ state: "retired" });
    } catch {
      /* Removal below may still work. */
    }
    try {
      retired = claim.read()?.state === "retired";
    } catch {
      retired = false;
    }
    if (!retired) {
      try {
        claim.clear();
      } catch {
        /* Verified below. */
      }
      try {
        retired = claim.read() === undefined;
      } catch {
        retired = false;
      }
    }
    // The answer is optional once the claim is gone, but leave nothing readable when that is possible.
    try {
      if (readAnswer() !== undefined) answer.write({ retired: true });
    } catch {
      /* Removal below may still work. */
    }
    try {
      if (readAnswer() !== undefined) answer.clear();
    } catch {
      /* The claim above already decides what a later page may trust. */
    }
    return retired;
  };
  return { read, write, retire };
}

/** A claim names one reservation, or records that it was retired; anything else is not a claim. */
function receiveOpenedClaim(value: unknown): OpenedClaim {
  const local = z
    .union([
      z.strictObject({ state: z.literal("retired") }),
      z.strictObject({
        state: z.literal("confirmed"),
        sourceRunId: z.string().min(1),
        targetRunId: z.string().min(1),
      }),
    ])
    .parse(value);
  if (local.state === "confirmed" && local.sourceRunId === local.targetRunId)
    throw new TabJournalUnavailable();
  return local;
}

/** The stored source is admitted by the public next-turn receiver, scoped to this conversation. */
function receiveOpenedReservation(
  scope: TabScope,
  value: unknown,
): OpenedReservation {
  const local = z
    .union([
      z.strictObject({ retired: z.literal(true) }),
      z.strictObject({ source: z.unknown(), targetRunId: z.string().min(1) }),
    ])
    .parse(value);
  if ("retired" in local) return { retired: true };
  const source = receiveConversationHistoryRequest(
    "nextTurn",
    bytes(local.source),
  );
  if (
    source.conversationId !== scope.conversationId ||
    source.sourceRunId === local.targetRunId
  )
    throw new TabJournalUnavailable();
  return {
    source: {
      conversationId: source.conversationId,
      sourceRunId: source.sourceRunId,
    },
    targetRunId: local.targetRunId,
  };
}

/**
 * The optional confirmation's own boundary. A record this page cannot read, save or retire only
 * means it asks control again; it must never fail the page, and a general journal refusal keeps its
 * own owner (`recoverPersistedTurn` still reports it as closed recovery).
 */
export function recoverOpenedReservation(
  scope: TabScope,
  storage?: TabStorage,
) {
  try {
    const record = persistedOpenedReservation(scope, storage);
    return {
      read() {
        try {
          return record.read();
        } catch {
          return undefined;
        }
      },
      write(target: { sourceRunId: string; targetRunId: string }) {
        try {
          record.write(target);
        } catch {
          /* Nothing durable was kept: the next page asks again. */
        }
      },
      retire() {
        try {
          return record.retire();
        } catch {
          // A hint this page could not retire must not be trusted as if it had been.
          return false;
        }
      },
    };
  } catch {
    return undefined;
  }
}
