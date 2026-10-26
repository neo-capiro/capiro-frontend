import { skipToken, type QueryClient } from "@tanstack/react-query";

const key = ["modules", "rich-newsletter", "write-journal"] as const;
type Status = "pending" | "unknown" | "confirmed";
export type DocumentAttempt = {
  attempt: number;
  status: Status;
  documentId: string;
  revision: number;
};
export type RichWriteState = { sequence: number; stages: DocumentAttempt[] };
export type WriteIntent = {
  kind: "stage";
  documentId: string;
  revision: number;
};
type Ticket = WriteIntent & { attempt: number };
const empty: RichWriteState = { sequence: 0, stages: [] };
const sameDocument = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();

/** Existing session/client stage-attempt owner only. Create/save use the canonical encrypted recovery journal. */
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
      if (
        before.stages.some(
          (entry) =>
            sameDocument(entry.documentId, intent.documentId) &&
            entry.revision === intent.revision,
        )
      )
        return;
      const ticket = { ...intent, attempt: before.sequence + 1 };
      update((state) => ({
        ...state,
        sequence: ticket.attempt,
        stages: [
          ...state.stages,
          {
            documentId: intent.documentId,
            revision: intent.revision,
            attempt: ticket.attempt,
            status: "pending",
          },
        ],
      }));
      return ticket;
    },
    finish(ticket: Ticket, status: Exclude<Status, "pending">) {
      // Canonical scope disposal may clear the cache before this view cleans up.
      if (!read().stages.some((item) => item.attempt === ticket.attempt))
        return;
      update((state) => ({
        ...state,
        stages: state.stages.map((item) =>
          item.attempt === ticket.attempt ? { ...item, status } : item,
        ),
      }));
    },
  };
}
export type RichWriteJournal = ReturnType<typeof createRichWriteJournal>;
