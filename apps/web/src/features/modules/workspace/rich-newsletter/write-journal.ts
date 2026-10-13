import { skipToken, type QueryClient } from "@tanstack/react-query";

const key = ["modules", "rich-newsletter", "write-journal"] as const;
type Status = "pending" | "unknown" | "conflict" | "confirmed" | "reviewed";
type Attempt = { attempt: number; status: Status };
export type DocumentAttempt = Attempt & {
  documentId: string;
  revision: number;
};
export type RichWriteState = {
  sequence: number;
  create?: Attempt;
  saves: DocumentAttempt[];
  stages: DocumentAttempt[];
};
export type WriteIntent =
  | { kind: "create" }
  | {
      kind: "save" | "stage";
      documentId: string;
      revision: number;
    };
type Ticket = WriteIntent & { attempt: number };
const empty: RichWriteState = { sequence: 0, saves: [], stages: [] };
const sameDocument = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();

export function pendingSavedWrite(writes: RichWriteState, id: string) {
  return writes.saves.find(
    (value) =>
      sameDocument(value.documentId, id) &&
      ["pending", "unknown", "conflict"].includes(value.status),
  );
}

/** Same QueryClient lifetime as canonical actor/session/org/client authority.
 * Only local attempt identities/status live here: never drafts, receipts or authority.
 * There is deliberately no query function, fetch, retry or durable storage.
 */
export function createRichWriteJournal(client: QueryClient) {
  const read = () => client.getQueryData<RichWriteState>(key) ?? empty;
  function update(change: (state: RichWriteState) => RichWriteState) {
    client.setQueryDefaults(key, {
      gcTime: Infinity,
      staleTime: Infinity,
      retry: false,
      queryFn: skipToken,
    });
    client.setQueryData<RichWriteState>(key, (state) => change(state ?? empty));
  }
  function finish(
    ticket: Ticket,
    status: Exclude<Status, "pending" | "reviewed">,
  ) {
    const current = read();
    const retained =
      ticket.kind === "create"
        ? current.create?.attempt === ticket.attempt
        : current[ticket.kind === "save" ? "saves" : "stages"].some(
            (item) => item.attempt === ticket.attempt,
          );
    // Canonical scope disposal may clear the cache before this view cleans up.
    if (!retained) return;
    update((state) => {
      if (ticket.kind === "create")
        return state.create?.attempt === ticket.attempt
          ? {
              ...state,
              create:
                status === "confirmed"
                  ? undefined
                  : { attempt: ticket.attempt, status },
            }
          : state;
      const field = ticket.kind === "save" ? "saves" : "stages";
      return {
        ...state,
        [field]: state[field].map((item) =>
          item.attempt === ticket.attempt ? { ...item, status } : item,
        ),
      };
    });
  }
  return {
    read,
    subscribe(listener: () => void) {
      return client.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === JSON.stringify(key))
          listener();
      });
    },
    begin(intent: WriteIntent): Ticket | undefined {
      const before = read();
      if (intent.kind === "create" && before.create) return;
      if (
        intent.kind === "save" &&
        pendingSavedWrite(before, intent.documentId)
      )
        return;
      if (
        intent.kind === "stage" &&
        before.stages.some(
          (entry) =>
            sameDocument(entry.documentId, intent.documentId) &&
            entry.revision === intent.revision,
        )
      )
        return;
      const ticket = { ...intent, attempt: before.sequence + 1 };
      update((state) => {
        const next = { ...state, sequence: ticket.attempt };
        if (intent.kind === "create")
          return {
            ...next,
            create: { attempt: ticket.attempt, status: "pending" },
          };
        const field = intent.kind === "save" ? "saves" : "stages";
        return {
          ...next,
          [field]: [
            ...state[field],
            {
              documentId: intent.documentId,
              revision: intent.revision,
              attempt: ticket.attempt,
              status: "pending",
            },
          ],
        };
      });
      return ticket;
    },
    finish,
    reviewSaved(id: string) {
      update((state) => ({
        ...state,
        saves: state.saves.map((item) =>
          sameDocument(item.documentId, id) &&
          ["unknown", "conflict"].includes(item.status)
            ? { ...item, status: "reviewed" }
            : item,
        ),
      }));
    },
  };
}

export type RichWriteJournal = ReturnType<typeof createRichWriteJournal>;
