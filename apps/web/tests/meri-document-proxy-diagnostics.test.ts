import { describe, expect, it } from "vitest";
import { createDocumentProxyDiagnostics } from "../src/shared/meri-documents/proxy-diagnostics";

/** A closed line per attempt; nothing private, nothing that claims a cause. */
const recorder = (now: () => number, limit = 20) => {
  const lines: string[] = [];
  const begin = createDocumentProxyDiagnostics({
    write: (line) => lines.push(line),
    now,
    limit,
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
  it("writes one closed line for an answer this edge produced itself", () => {
    const { lines, attempt } = recorder(() => 1_000);
    const { entry } = attempt("/api/documents/inspect");
    entry.stage("session");
    entry.finish(401, "response");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual({
      event: "MERI_DOCUMENT_FE",
      operation: "/api/documents/inspect",
      stage: "session",
      outcome: "local_response",
      status: 401,
      upstreamStatus: 0,
    });
  });

  it("names an upstream answer, a failure and the last stage reached", () => {
    const { attempt } = recorder(() => 1_000);
    const answered = attempt("/api/documents/inspect");
    answered.entry.stage("fetch");
    answered.entry.stage("receive");
    answered.entry.received(502);
    answered.entry.finish(502, "response");
    expect(answered.line()).toMatchObject({
      stage: "receive",
      outcome: "upstream_response",
      status: 502,
      upstreamStatus: 502,
    });
    const failed = attempt("/api/documents/download");
    failed.entry.stage("receive");
    failed.entry.finish(502, "failure");
    expect(failed.line()).toMatchObject({
      stage: "receive",
      outcome: "failure",
      status: 502,
      upstreamStatus: 0,
    });
  });

  it("keeps only a closed public operation, never a selector, query or identifier", () => {
    const { attempt } = recorder(() => 1_000);
    for (const operation of [
      undefined,
      "",
      "/api/documents/",
      "/api/documents/Inspect",
      "/api/documents/inspect?versionId=12345678-1234-4234-8234-123456789012",
      "/api/documents/..%2Fcreate",
      `/api/documents/inspect/${"a".repeat(64)}`,
      "12345678-1234-4234-8234-123456789012",
    ]) {
      const { entry, line } = attempt(operation);
      entry.finish(404, "response");
      expect(line()).not.toHaveProperty("operation");
    }
    const accepted = attempt("/api/documents/preview-publish");
    accepted.entry.finish(200, "response");
    expect(accepted.line()).toMatchObject({
      operation: "/api/documents/preview-publish",
    });
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

  it("records one terminal line per attempt and bounds the lines per window", () => {
    let at = 1_000;
    const { lines, attempt } = recorder(() => at, 1);
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
    for (let index = 0; index < 2; index += 1)
      attempt("/api/documents/inspect").entry.finish(401, "response");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("MERI_DOCUMENT_FE_SUPPRESSED");
    at += 60_000;
    attempt("/api/documents/inspect").entry.finish(401, "response");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[2]!)).toMatchObject({ status: 401 });
  });

  it("cannot throw into the transport when the writer or the clock fails", () => {
    const throwing = createDocumentProxyDiagnostics({
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
  });
});
