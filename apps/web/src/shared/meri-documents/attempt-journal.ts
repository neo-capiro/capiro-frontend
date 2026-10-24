export type DocumentProblem =
  | "not-dispatched"
  | "unknown"
  | "result-withheld"
  | "read-unavailable"
  | "native-revision-unavailable"
  | "access-lost"
  | "invalid-response";

/** Fingerprints and dispositions only: no private content, receipt or credential. */
export type DocumentAttempt = Readonly<{
  status: "idle" | "pending" | "unresolved";
  fingerprints: readonly string[];
  attemptId?: string;
  problem?: DocumentProblem;
}>;
export interface DocumentAttemptJournal {
  read(): DocumentAttempt;
  write(attempt: DocumentAttempt): void;
}
export const idleDocumentAttempt: DocumentAttempt = Object.freeze({
  status: "idle",
  fingerprints: Object.freeze([]),
});
