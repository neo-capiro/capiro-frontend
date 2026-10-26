import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UIEvent } from "@capiro/meri-contracts";
import { validateUIEvent } from "@capiro/meri-contracts/browser";
import { ConversationTurn } from "../src/features/meri/conversation/ConversationTurn";
import { savedTurns } from "../src/features/meri/conversation/saved-turns";
import {
  turnFromEvents,
  type TurnView,
} from "../src/features/meri/conversation/conversation-view";
import { runActivityEvents } from "../src/features/meri/fixtures/run-activity-events";

const events = runActivityEvents("activity");
const sourceEvent = events.find((event) => event.type === "source.available")!;
if (sourceEvent.type !== "source.available")
  throw new Error("Missing source fixture");
const source = sourceEvent.data;
const savedTurn = (input: readonly UIEvent[] = events) =>
  turnFromEvents(input, events[0]!.binding, null, "completed", false);
const render = (patch: Partial<TurnView> = {}) =>
  renderToStaticMarkup(
    createElement(ConversationTurn, {
      turn: { ...savedTurn(), ...patch },
      label: "Saved turn",
      showPrompt: false,
    }),
  );

describe("saved citation reference presentation", () => {
  it("retains the exact admitted reference after reload and labels its current-access limit", () => {
    expect(events.every(validateUIEvent)).toBe(true);
    const restored = savedTurn(JSON.parse(JSON.stringify(events)));
    expect(restored.sources).toEqual(savedTurn().sources);
    expect(restored.sources[0]).toEqual(source);
    const html = render(restored);
    expect(html).toContain("Saved references · 1");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Source preview unavailable");
    expect(html).toContain("do not confirm current access");
    expect(html).not.toContain("authorized source record");
    for (const privateReference of [
      source.sourceId,
      source.sourceVersionId,
      source.recordId,
      source.authorizationDecisionId,
      source.contentSha256,
    ])
      expect(html).not.toContain(privateReference);
  });

  it("keeps two admitted versions distinct even when their citation labels coincide", () => {
    const later = { ...source, sourceVersionId: "synthetic-later-version" };
    const restored = savedTurn([
      sourceEvent,
      { ...sourceEvent, sequence: sourceEvent.sequence + 1, data: later },
    ]);
    expect(restored.sources).toEqual([source, later]);
    const html = render(restored);
    expect(html).toContain("Saved references · 2");
    expect(html).not.toContain(source.sourceVersionId);
    expect(html).not.toContain("synthetic-later-version");
  });

  it("omits unavailable source details without inventing freshness or current authorization", () => {
    const html = render({ sources: [{ ...source, sourceUpdatedAt: null }] });
    expect(html).not.toContain("Not provided");
    expect(html).not.toContain("Source updated");
    expect(html).not.toContain("Up to date");
    const dated = render({
      sources: [{ ...source, sourceUpdatedAt: "2026-10-01T12:00:00Z" }],
    });
    expect(dated).toContain("do not confirm current access");
    expect(dated).not.toContain("Up to date");
  });

  it("distinguishes missing references in a complete view from a partial loaded view", () => {
    expect(render({ sources: [] })).toContain(
      "No source references were provided.",
    );
    for (const patch of [
      { omittedPrefix: true },
      { incompleteHistory: true },
    ]) {
      expect(render({ sources: [], ...patch })).toContain(
        "No source references in the loaded updates.",
      );
      expect(render({ sources: [], ...patch })).not.toContain(
        "No source references were provided.",
      );
      expect(render(patch)).toContain(
        "Some saved reference details are unavailable. This does not mean the answer had no sources.",
      );
    }
  });

  it("never turns model text or source metadata into a URL, HTML, excerpt, or execution", () => {
    const text =
      "[citation](javascript:alert(1)) <script>alert(2)</script> https://untrusted.invalid/source";
    const html = render({
      messages: [{ messageId: "synthetic-message", text }],
      sources: [
        {
          ...source,
          sourceId: "https://untrusted.invalid/metadata",
          sourceVersionId: '<img src=x onerror="alert(3)">',
        },
      ],
    });
    expect(html).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
    expect(html).not.toContain("untrusted.invalid/metadata");
    expect(html).not.toContain("&lt;img src=x");
    expect(html).toContain("[citation](javascript:alert(1))");
    expect(html).not.toMatch(/<a\b|<script\b|<img src=x|<iframe\b/);
  });

  it("does not retain a source when its parent supplies a cleared current view", () => {
    expect(render()).toContain("Saved references · 1");
    const cleared = render({ sources: [], messages: [], tools: [] });
    expect(cleared).not.toContain(source.sourceVersionId);
    expect(cleared).not.toContain(source.sourceId);
    expect(cleared).not.toContain("Saved references ·");
    expect(cleared).toContain("No source references were provided.");
  });
});

describe("tool-result truthfulness", () => {
  it("qualifies a missing result until its saved completion update is loaded", () => {
    const firstStart = events.findIndex(
      (event) => event.type === "tool.started",
    );
    const started = events[firstStart]!;
    if (started.type !== "tool.started")
      throw new Error("Missing tool fixture");
    expect(
      events
        .slice(firstStart + 1)
        .some(
          (event) =>
            event.type === "tool.completed" &&
            event.data.requestId === started.data.requestId,
        ),
    ).toBe(true);
    const restore = (loaded: readonly UIEvent[]) =>
      savedTurns({
        latest: {},
        turns: [
          {
            run: { binding: events[0]!.binding, state: "completed" },
            request: { prompt: "Synthetic partial history" },
            promptLineage: { logicalRequestId: "synthetic-request" },
            lastSequence: events.at(-1)!.sequence,
          },
        ],
        events: loaded.map((event) => ({ sequence: event.sequence, event })),
        // Only the already-admitted fields consumed by the saved-turn fold.
      } as unknown as NonNullable<Parameters<typeof savedTurns>[0]>)[0]!;
    const partial = restore(events.slice(0, firstStart + 1));
    expect(partial.incompleteHistory).toBe(true);
    expect(partial.runState).toBe("completed");
    const partialHtml = render(partial);
    expect(partialHtml).toContain(
      "More saved updates for this run have not been loaded.",
    );
    expect(partialHtml).not.toContain("No result recorded");
    expect(partialHtml).toContain("Result not in loaded updates");
    const full = restore(events);
    expect(full.incompleteHistory).toBe(false);
    expect(render(full)).toContain("Result recorded · outcome unavailable");
    expect(render(full)).not.toContain("Result not in loaded updates");
    expect(
      render({ ...partial, incompleteHistory: false, omittedPrefix: true }),
    ).toContain("Result not in loaded updates");
  });

  it("does not present a recorded result as success when a run error follows", () => {
    const html = render({
      runState: "failed",
      errors: [
        {
          code: "TOOL_UNAVAILABLE",
          message: "The run stopped because of an error.",
          retryable: false,
        },
      ],
      tools: [
        {
          requestId: "synthetic-request",
          name: "Synthetic read",
          resultReference: "synthetic-result",
        },
      ],
    });
    expect(html).toContain("Result recorded · outcome unavailable");
    expect(html).toContain("Run error");
    expect(html).not.toContain("Done");
    expect(html).not.toContain("In progress");
  });

  it("does not leave an unfinished tool running after its run ends", () => {
    const tools = [
      { requestId: "synthetic-request", name: null, resultReference: null },
    ];
    for (const runState of ["completed", "failed", "cancelled"] as const) {
      const html = render({ tools, runState });
      expect(html).toContain("No result recorded");
      expect(html).not.toContain("Awaiting result");
    }
    expect(render({ tools, runState: "running" })).toContain("Awaiting result");
  });
});
