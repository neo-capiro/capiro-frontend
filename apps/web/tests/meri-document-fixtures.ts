import { vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { DocumentContentRequest } from "@capiro/meri-contracts/document-application";
import { DocumentWorkflow } from "../src/shared/meri-documents/workflow-adapter";
import { documentTransport } from "../src/shared/meri-documents/workflow-transport";
import { documentQueryJournal } from "../src/shared/meri-documents/query-journal";
import { session } from "./meri-document-public-fixtures";
export * from "./meri-document-public-fixtures";

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export function fixture(
  operation: DocumentContentRequest["operation"] = "create_word",
  cache = new QueryClient(),
) {
  const responses: (Response | Promise<Response>)[] = [];
  const fetcher = vi.fn<typeof fetch>(async () => {
    const response = responses.shift();
    if (!response) throw new Error("Missing synthetic response");
    return response;
  });
  const lifetime = new AbortController();
  const journal = documentQueryJournal(cache, session.context);
  const onAccessLost = vi.fn();
  let available = true;
  let now = 1_000;
  const workflow = () =>
    new DocumentWorkflow({
      session,
      operation,
      journal,
      transport: documentTransport(
        session.credential,
        lifetime.signal,
        fetcher,
      ),
      onAccessLost,
      isCurrent: () => available,
      now: () => now,
    });
  return {
    workflow,
    responses,
    fetcher,
    lifetime,
    journal,
    cache,
    onAccessLost,
    setAvailable(value: boolean) {
      available = value;
    },
    setNow(value: number) {
      now = value;
    },
  };
}
export const signal = () => new AbortController().signal;
