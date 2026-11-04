import type { ConversationSessionReceipt } from "@capiro/meri-contracts/conversation-session";
import type { ConversationTranscriptPage } from "./history-client";
import type { ConversationSessionHints } from "./session";
import type { TurnIntent } from "./turn-journal";

type Page = ConversationTranscriptPage;
type Binding = Pick<
  ConversationSessionReceipt["context"],
  "conversationId" | "runId"
>;
type QueryState = {
  dataUpdatedAt: number;
  isFetching: boolean;
  isPending: boolean;
};
export type OpeningProjection = {
  hints: ConversationSessionHints;
  current?: Page;
  savedTurns: readonly Page["turns"][number][];
  query: QueryState;
  tail: QueryState;
  intent?: TurnIntent;
  opened?: string;
  runId?: string;
  unknownReservation: boolean;
  shown: readonly {
    runId: string;
    runState: string;
    throughSequence?: number;
    hasMessages: boolean;
  }[];
};
const states = new Set([
  "queued",
  "starting",
  "running",
  "waiting-for-approval",
  "paused",
  "completed",
  "failed",
  "cancelled",
]);
const number = (value: number | null | undefined) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
const state = (value: string) => (states.has(value) ? value : "unavailable");
type End =
  | "disposed"
  | "owner-changed"
  | "deadline"
  | "record-limit"
  | "byte-limit"
  | "alias-limit"
  | "observer-error";

/** One disposable diagnostic only. No request, authority, storage or recovery behavior. */
class OpeningCapture {
  private aliases = new Map<string, string>();
  private received = new WeakMap<Page, number>();
  private signal?: AbortSignal;
  private timer?: ReturnType<typeof setTimeout>;
  private started?: number;
  private closed = false;
  private records = 0;
  private bytes = 0;
  private previousProjection?: string;
  private readonly aborted = () => this.stop("disposed");
  constructor(
    private readonly caseNonce: string,
    private readonly write: (line: string) => void,
    private readonly now: () => number,
  ) {}

  private alias(kind: "c" | "r" | "q", value: string | null | undefined) {
    if (value == null) return null;
    if (typeof value !== "string" || value.length < 1 || value.length > 128)
      throw Error();
    const key = `${kind}:${value}`;
    let alias = this.aliases.get(key);
    if (!alias) {
      if (this.aliases.size >= 256) {
        this.stop("alias-limit");
        throw Error();
      }
      alias = `${kind}${this.aliases.size + 1}`;
      this.aliases.set(key, alias);
    }
    return alias;
  }
  private binding(value: Binding | null | undefined) {
    return value
      ? {
          conversation: this.alias("c", value.conversationId),
          run: this.alias("r", value.runId),
        }
      : null;
  }
  private hints(value: ConversationSessionHints) {
    return {
      conversation: this.alias("c", value.conversationId),
      run: this.alias("r", value.runId),
      hasClient: value.clientId !== null,
    };
  }
  private pending(value: Page["pendingTurn"] | TurnIntent["receipt"]) {
    return value
      ? {
          source: this.binding(value.sourceBinding),
          target: this.binding(value.targetBinding),
          state:
            value.state === "RESERVED" || value.state === "ACCEPTED"
              ? value.state
              : "unavailable",
        }
      : null;
  }
  private turn(value: Page["turns"][number]) {
    const lineage = value.promptLineage;
    return {
      binding: this.binding(value.run.binding),
      state: state(value.run.state),
      request: this.alias("q", value.request.requestId),
      logicalRequest: this.alias("q", lineage.logicalRequestId),
      lineage: ["submission", "resume", "fork"].includes(lineage.kind)
        ? lineage.kind
        : "unavailable",
      source: this.binding(lineage.sourceBinding),
      sourceRequest: this.alias("q", lineage.sourceRequestId),
      base: number(value.sequenceBase),
      end: number(value.sequenceEnd),
      last: number(value.lastSequence),
    };
  }
  private page(value: Page | undefined) {
    return value
      ? {
          latest: this.binding(value.latestRun.binding),
          state: state(value.latestRun.state),
          pending: this.pending(value.pendingTurn),
          latestBase: number(value.latestSequenceBase),
          next: number(value.nextSequence),
          last: number(value.lastSequence),
          hasMore: value.hasMore === true,
          turns: value.turns.slice(-4).map((turn) => this.turn(turn)),
          omittedTurns: Math.max(0, value.turns.length - 4),
        }
      : null;
  }
  private emit(kind: string, make: () => object, dedupe = false) {
    if (this.closed || this.started === undefined) return;
    try {
      const elapsed = this.now() - this.started;
      if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= 120_000)
        return this.stop("deadline");
      const data = make();
      const projection = dedupe ? JSON.stringify(data) : undefined;
      if (dedupe && projection === this.previousProjection) return;
      if (this.closed) return;
      const line = JSON.stringify({
        event: "MERI_OPENING_CAPTURE",
        case: this.caseNonce,
        sequence: this.records + 1,
        elapsedMs: Math.floor(elapsed),
        kind,
        data,
      });
      const bytes = new TextEncoder().encode(line).length;
      if (this.records >= 31 || bytes > 4096) return this.stop("record-limit");
      if (this.bytes + bytes > 65024) return this.stop("byte-limit");
      this.records++;
      this.bytes += bytes;
      this.write(line);
      if (dedupe) this.previousProjection = projection;
    } catch {
      this.stop("observer-error");
    }
  }
  start(hints: ConversationSessionHints, signal: AbortSignal) {
    if (this.closed) return;
    try {
      if (this.signal && this.signal !== signal)
        return this.stop("owner-changed");
      if (signal.aborted) return this.stop("disposed");
      if (!this.signal) {
        this.signal = signal;
        this.started = this.now();
        signal.addEventListener("abort", this.aborted, { once: true });
        this.timer = setTimeout(() => this.stop("deadline"), 120_000);
      }
      this.emit("opening", () => ({
        hints: this.hints(hints),
        ordinary: true,
      }));
    } catch {
      this.stop("observer-error");
    }
  }
  admitted(receipt: ConversationSessionReceipt) {
    this.emit("admitted", () => ({
      binding: this.binding(receipt.context),
      reboundSource: this.alias("r", receipt.initialRunRebind?.sourceRunId),
      reboundTarget: this.alias("r", receipt.initialRunRebind?.targetRunId),
      // The canonical receipt has no requestId. Do not invent one from a selector.
      requestField: "not-in-receipt",
    }));
  }
  history(page: Page) {
    this.emit("history-received", () => {
      this.received.set(page, this.records + 1);
      return { page: this.page(page) };
    });
  }
  projection(value: OpeningProjection) {
    this.emit(
      "projection",
      () => ({
        hints: this.hints(value.hints),
        run: this.alias("r", value.runId),
        opened: this.alias("r", value.opened),
        current: this.page(value.current),
        currentReceivedSequence: value.current
          ? (this.received.get(value.current) ?? null)
          : null,
        // React Query may structurally share a response. Missing object correlation is unobserved, never proof of cache origin.
        currentProvenance: !value.current
          ? "absent"
          : this.received.has(value.current)
            ? "received-this-capture"
            : "cache-or-unobserved",
        query: {
          updatedAt: number(value.query.dataUpdatedAt),
          fetching: value.query.isFetching === true,
          pending: value.query.isPending === true,
        },
        tail: {
          updatedAt: number(value.tail.dataUpdatedAt),
          fetching: value.tail.isFetching === true,
          pending: value.tail.isPending === true,
        },
        intent: value.intent
          ? {
              source: this.binding(value.intent.source),
              request: this.alias("q", value.intent.requestId),
              state: ["reserving", "unknown", "ready"].includes(
                value.intent.state,
              )
                ? value.intent.state
                : "unavailable",
              receipt: this.pending(value.intent.receipt),
            }
          : null,
        unknownReservation: value.unknownReservation === true,
        saved: value.savedTurns.slice(-4).map((turn) => this.turn(turn)),
        omittedSaved: Math.max(0, value.savedTurns.length - 4),
        shown: value.shown.slice(-4).map((turn) => ({
          run: this.alias("r", turn.runId),
          state: state(turn.runState),
          through: number(turn.throughSequence),
          hasMessages: turn.hasMessages === true,
        })),
        omittedShown: Math.max(0, value.shown.length - 4),
      }),
      true,
    );
  }
  stop(reason: End = "disposed") {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timer);
    this.signal?.removeEventListener("abort", this.aborted);
    this.signal = undefined;
    this.aliases.clear();
    this.received = new WeakMap();
    this.previousProjection = undefined;
    if (this.started === undefined) return;
    try {
      const line = JSON.stringify({
        event: "MERI_OPENING_CAPTURE",
        case: this.caseNonce,
        sequence: this.records + 1,
        kind: "stopped",
        reason,
        incomplete: true,
      });
      const bytes = new TextEncoder().encode(line).length;
      if (this.records < 32 && bytes <= 4096 && this.bytes + bytes <= 65536)
        this.write(line);
    } catch {
      /* Diagnostics never escape into their product owner. */
    }
  }
}
export type { OpeningCapture };

/** Read once before initial host construction; no ambient process or persistent activation. */
export function createOpeningCapture(
  search: string,
  { write = (line: string) => console.info(line), now = Date.now } = {},
) {
  try {
    if (search.length > 4096) return;
    const params = new URLSearchParams(search);
    if (
      params.getAll("meriOpeningCapture").length !== 1 ||
      params.get("meriOpeningCapture") !== "1" ||
      params.getAll("meriCaptureCase").length !== 1
    )
      return;
    const nonce = params.get("meriCaptureCase");
    if (!nonce || !/^qa_[a-z0-9]{8,24}$/.test(nonce)) return;
    return new OpeningCapture(nonce, write, now);
  } catch {
    return;
  }
}
