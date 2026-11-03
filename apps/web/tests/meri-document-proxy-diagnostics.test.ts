import { describe, expect, it } from "vitest";
import { createHistoryTransportDiagnostics } from "../src/shared/meri-conversations/history-diagnostics";

/**
 * The documents proxy reuses the canonical transport recorder; these cover only what the document
 * caller adds (its closed route label) and the shared guarantees it depends on: one terminal line per
 * attempt, the 20 + 1 cap, no private content, and writer/clock/trace fail-safety. Synthetic only.
 */
const documentEvent = "MERI_DOCUMENT_FE";
const recorder = (now: () => number) => {
  const lines: string[] = [];
  const begin = createHistoryTransportDiagnostics({
    event: documentEvent,
    write: (line) => lines.push(line),
    now,
  });
  const attempt = (operation?: string) => {
    const from = lines.length;
    const entry = begin(operation)!;
    return {
      entry,
      line: () =>
        lines.length > from
          ? (JSON.parse(lines[from]!) as Record<string, unknown>)
          : undefined,
    };
  };
  return { lines, attempt };
};

describe("document proxy transport diagnostic", () => {
  it("records the document route and the stage this edge reached", () => {
    const { lines, attempt } = recorder(() => 1_000);
    const { entry, line } = attempt("/api/documents/inspect");
    entry.stage("session");
    entry.finish(401, "response");
    expect(lines).toHaveLength(1);
    expect(line()).toEqual({
      event: documentEvent,
      trace: expect.stringMatching(/^h1_[0-9a-f]{32}$/u),
      operation: "/api/documents/inspect",
      stage: "session",
      outcome: "local_response",
      status: 401,
      upstreamStatus: 0,
    });
  });

  it("records a forwarded status without claiming the answer was admitted", () => {
    const { attempt } = recorder(() => 1_000);
    const forwarded = (status: number) => {
      const { entry, line } = attempt("/api/documents/inspect");
      entry.stage("receive");
      entry.received(status);
      entry.finish(status, "response");
      return line();
    };
    // A canonical session refusal and malformed bytes with the same status are indistinguishable here:
    // the proxy forwards bounded bytes and never parses the response DTO.
    const refusal = forwarded(403);
    const malformed = forwarded(403);
    expect(refusal).toMatchObject({
      stage: "receive",
      outcome: "upstream_response",
      status: 403,
      upstreamStatus: 403,
    });
    expect({ ...malformed, trace: "same" }).toEqual({
      ...refusal,
      trace: "same",
    });
    const unanswered = attempt("/api/documents/download");
    unanswered.entry.stage("fetch");
    unanswered.entry.finish(502, "failure");
    expect(unanswered.line()).toMatchObject({
      stage: "fetch",
      outcome: "failure",
      status: 502,
      upstreamStatus: 0,
    });
  });

  it("keeps only a closed public document route, never a selector or identifier", () => {
    // The grammar is the shared recorder's; the documents caller narrows it further by passing a label
    // only for its own admitted fixed routes (asserted through the proxy).
    const { attempt } = recorder(() => 1_000);
    for (const operation of [
      undefined,
      "",
      "/api/documents/",
      "/api/documents/Inspect",
      "/api/documents/inspect?versionId=synthetic",
      "/api/documents/..%2Fcreate",
      `/api/documents/inspect/${"a".repeat(64)}`,
      "synthetic-version-selector",
    ]) {
      const refused = attempt(operation);
      refused.entry.finish(404, "response");
      expect(refused.line()).not.toHaveProperty("operation");
    }
    for (const operation of [
      "/api/documents/inspect",
      "/api/documents/preview-publish",
      "/api/documents/federal-prepare",
    ]) {
      const accepted = attempt(operation);
      accepted.entry.finish(200, "response");
      expect(accepted.line()).toMatchObject({ operation });
    }
  });

  it("ignores a stage outside the closed vocabulary and a status outside HTTP", () => {
    const { attempt } = recorder(() => 1_000);
    const closed = attempt("/api/documents/inspect");
    closed.entry.stage("authority" as never);
    closed.entry.received(99);
    closed.entry.finish(502, "response");
    expect(closed.line()).toMatchObject({
      stage: "request",
      upstreamStatus: 0,
      outcome: "local_response",
    });
    const refused = attempt("/api/documents/inspect");
    refused.entry.finish(99, "response");
    expect(refused.line()).toBeUndefined();
  });

  it("keeps one terminal line per attempt and the 20 + 1 cap with a minute reset", () => {
    let at = 1_000;
    const { lines, attempt } = recorder(() => at);
    const first = attempt("/api/documents/inspect");
    first.entry.finish(401, "response");
    first.entry.finish(502, "failure");
    first.entry.stage("fetch");
    first.entry.received(500);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({
      status: 401,
      stage: "request",
      outcome: "local_response",
    });
    for (let index = 0; index < 20; index += 1)
      attempt("/api/documents/inspect").entry.finish(401, "response");
    expect(lines).toHaveLength(21);
    expect(lines[20]).toBe("MERI_DOCUMENT_FE_SUPPRESSED");
    at += 60_000;
    attempt("/api/documents/inspect").entry.finish(401, "response");
    expect(lines).toHaveLength(22);
    expect(JSON.parse(lines[21]!)).toMatchObject({ status: 401 });
  });

  it("cannot throw into the transport when the writer, clock or trace fails", () => {
    const throwing = createHistoryTransportDiagnostics({
      event: documentEvent,
      write: () => {
        throw new Error("synthetic writer failure");
      },
      now: () => {
        throw new Error("synthetic clock failure");
      },
    });
    const entry = throwing("/api/documents/inspect")!;
    expect(() => {
      entry.stage("receive");
      entry.received(403);
      entry.finish(403, "response");
    }).not.toThrow();
    const untraceable = createHistoryTransportDiagnostics({
      event: documentEvent,
      newTrace: () => {
        throw new Error("synthetic trace failure");
      },
    });
    expect(untraceable("/api/documents/inspect")).toBeUndefined();
  });
});
