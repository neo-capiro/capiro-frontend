import { z } from "zod";
import {
  submissionIdentity,
  receiveSkillSelection,
  skillSelectionFields,
  type ConversationDraftRequest,
  type ConversationSkillSelection,
  type ConversationIntent,
} from "./query-journal";
import {
  tabRecord,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "./tab-journal";
import type { ConversationContext } from "./session";

const capture = z.strictObject({
  draft: z.string(),
  revision: z.number().int().nonnegative().safe(),
});
const draftState = z.strictObject({
  draft: z.string(),
  revision: z.number().int().nonnegative().safe(),
  pending: capture
    .extend({ run: z.string(), request: z.string(), continuation: z.boolean() })
    .nullable(),
  reserved: capture.extend({ request: z.string() }).nullable(),
  selection: z.unknown().transform(receiveSkillSelection).optional(),
});
type DraftState = z.infer<typeof draftState>;
const empty = (): DraftState => ({
  draft: "",
  revision: 0,
  pending: null,
  reserved: null,
});
const runKey = (context: ConversationContext) =>
  JSON.stringify([
    context.tenantId,
    context.actorId,
    context.selectedClientId,
    context.conversationId,
    context.runId,
  ]);

/** One atomic draft/capture record; retained bytes never establish request acceptance. */
class DraftOwner {
  private state = empty();
  private version = 0;
  private listeners = new Set<() => void>();
  snapshot = () => this.version;
  subscribe = (notify: () => void) => {
    this.listeners.add(notify);
    return () => {
      this.listeners.delete(notify);
    };
  };
  private changed() {
    this.version++;
    for (const notify of this.listeners) notify();
  }
  private record: ReturnType<typeof tabRecord<DraftState>> | undefined;
  private blocked = false;
  constructor(
    private scope?: TabScope,
    storage?: TabStorage,
  ) {
    if (!scope) return;
    try {
      this.record = tabRecord(
        scope,
        "draft",
        (value) => draftState.parse(value),
        "",
        storage ?? null,
      );
      this.state = this.record.read() ?? empty();
    } catch {
      this.blocked = true;
    }
  }
  error = () =>
    this.blocked || this.record?.current() === false
      ? new TabJournalUnavailable().message
      : undefined;
  fail = () => {
    if (this.blocked) return;
    this.blocked = true;
    this.changed();
  };
  draft = () => this.state.draft;
  revision = () => this.state.revision;
  selection = () => this.state.selection;
  selectSkill(selection: ConversationSkillSelection) {
    this.save({
      ...this.state,
      selection: receiveSkillSelection(skillSelectionFields(selection)),
      revision: this.state.revision + 1,
    });
  }
  private check(context?: ConversationContext) {
    if (
      this.error() ||
      (context &&
        this.scope &&
        (context.tenantId !== this.scope.tenantId ||
          context.actorId !== this.scope.actorId ||
          context.selectedClientId !== this.scope.clientId ||
          context.conversationId !== this.scope.conversationId))
    )
      throw new TabJournalUnavailable();
  }
  private save(next: DraftState) {
    try {
      this.check();
      this.record?.write(next);
      this.state = next;
      this.changed();
    } catch {
      this.blocked = true;
      this.changed();
      throw new TabJournalUnavailable();
    }
  }
  /** Typing survives a storage error in the mounted page; commands remain blocked. */
  edit(value = this.state.draft) {
    const next = {
      ...this.state,
      draft: value,
      revision: this.state.revision + 1,
    };
    try {
      this.save(next);
    } catch (error) {
      this.state = next;
      this.changed();
      throw error;
    }
  }
  /**
   * Hand an unsent draft composed outside the conversation to this conversation. This is the only
   * entry point a starter surface may use: it refuses to disturb a draft the person already
   * started or an unresolved submission, and it keeps the same scope, storage and revocation
   * fences, the same retained selection and the same revision accounting as editing in place.
   */
  startUnsentStarter(draft: string) {
    if (this.state.pending || this.state.reserved)
      throw new Error(
        "This conversation has an unresolved message. Recover it before starting a draft.",
      );
    if (this.state.draft.trim())
      throw new Error(
        "This conversation already holds an unsent draft. Clear it before starting another.",
      );
    this.save({
      ...this.state,
      draft,
      revision: this.state.revision + 1,
    });
  }
  begin(
    context: ConversationContext,
    request: ConversationDraftRequest,
    draft: string,
    capturedRevision = this.state.revision,
    continuation = false,
  ) {
    this.check(context);
    const pending = {
      run: runKey(context),
      request: submissionIdentity(request),
      draft,
      revision: capturedRevision,
      continuation,
    };
    if (
      this.state.pending?.run === pending.run &&
      this.state.pending.request !== pending.request
    )
      throw new TabJournalUnavailable();
    this.save({ ...this.state, pending, reserved: null });
  }
  select(context: ConversationContext) {
    this.check(context);
    if (
      this.state.pending &&
      !this.state.pending.continuation &&
      this.state.pending.run !== runKey(context)
    )
      this.save({ ...this.state, pending: null });
  }
  reserve(draft: string, request: ConversationDraftRequest) {
    this.save({
      ...this.state,
      reserved: {
        draft,
        revision: this.state.revision,
        request: submissionIdentity(request),
      },
    });
  }
  bindNext(context: ConversationContext, request: ConversationDraftRequest) {
    const captured = this.state.reserved;
    if (captured && captured.request !== submissionIdentity(request)) return;
    if (captured)
      this.begin(context, request, captured.draft, captured.revision, true);
    else if (
      this.state.pending &&
      (this.state.pending.run !== runKey(context) ||
        this.state.pending.request !== submissionIdentity(request))
    )
      throw new TabJournalUnavailable();
  }
  /** Revocation already removed the exact scope; never recreate its record from a late response. */
  reset() {
    this.state = empty();
    this.blocked = true;
    this.changed();
  }
  hasPending = (context: ConversationContext) =>
    this.state.pending?.run === runKey(context);
  acknowledge(
    context: ConversationContext,
    submit: ConversationIntent["submit"],
    draft: string,
  ) {
    const pending = this.state.pending;
    if (
      !pending ||
      submit?.state !== "observed" ||
      pending.run !== runKey(context)
    )
      return false;
    this.check(context);
    const request = { ...submit };
    Reflect.deleteProperty(request, "state");
    Reflect.deleteProperty(request, "workflow");
    if (submissionIdentity(request) !== pending.request) return false;
    const clear =
      pending.revision === this.state.revision && draft === pending.draft;
    this.save({
      ...this.state,
      draft: clear ? "" : this.state.draft,
      pending: null,
    });
    return clear;
  }
}

/** Local draft consumption follows the conversation lifetime, including replacement sessions. */
export const createInitialDraftOwner = (
  scope?: TabScope,
  storage?: TabStorage,
) => new DraftOwner(scope, storage);
export type InitialDraftOwner = ReturnType<typeof createInitialDraftOwner>;
