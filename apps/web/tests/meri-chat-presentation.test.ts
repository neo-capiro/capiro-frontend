import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationTurn } from "../src/features/meri/conversation/ConversationTurn";
import { ConversationEvidence } from "../src/features/meri/conversation/evidence/ConversationEvidence";
import {
  CheckpointActions,
  RunLifecycleControls,
  guidanceCommand,
} from "../src/features/meri/conversation/lifecycle/RunLifecycleControls";
import { ConversationFrame } from "../src/features/meri/conversation/ConversationFrame";
import {
  turnFromEvents,
  type TurnView,
} from "../src/features/meri/conversation/conversation-view";
import type { ConversationReads } from "../src/shared/meri-conversations/current-reads";
import type { MeriUploadAccess } from "../src/shared/meri-uploads/access";
import { ModelCatalogContext } from "../src/features/meri/model-selection/ModelCatalogContext";
import { runModelLabel } from "../src/features/meri/model-selection/model-selection";
import { modelCatalog } from "./meri-user-preferences-fixtures";
import { savedTurns } from "../src/features/meri/conversation/saved-turns";

const binding = { runId: "30000000-0000-4000-8000-000000000001" };
const turn = (
  runState: TurnView["runState"],
  patch: Partial<TurnView> = {},
): TurnView => ({
  ...turnFromEvents([], binding, "Synthetic question", runState, false),
  messages: [{ messageId: "synthetic-message", text: "Synthetic answer." }],
  ...patch,
});
const render = (view: TurnView) =>
  renderToStaticMarkup(
    createElement(ConversationTurn, { turn: view, label: "Current turn" }),
  );
const evidence = (
  view: TurnView | null,
  earlier: readonly TurnView[] = [],
  children?: string,
) =>
  renderToStaticMarkup(
    createElement(
      ConversationEvidence,
      {
        reads: {} as ConversationReads,
        uploads: {} as MeriUploadAccess,
        turn: view,
        earlier,
      },
      children,
    ),
  );
type Lifecycle = ComponentProps<typeof RunLifecycleControls>["lifecycle"];
const idle = (patch: Partial<Lifecycle> = {}) =>
  ({
    command: undefined,
    busy: false,
    error: undefined,
    receipt: undefined,
    checkpoint: undefined,
    blocked: undefined,
    available: true,
    send: vi.fn(),
    retry: vi.fn(),
    inspect: vi.fn(),
    ...patch,
  }) as Lifecycle;

describe("a finished answer reads like a chat", () => {
  it("shows the prompt, the answer and nothing else for a completed run", () => {
    const html = render(turn("completed"));
    expect(html).toContain('data-run-state="completed"');
    expect(html).toContain("Synthetic question");
    expect(html).toContain("Synthetic answer.");
    expect(html).not.toContain("Completed");
    expect(html).not.toContain("Meri is working");
    expect(html).not.toContain("Service reason");
    expect(html).not.toContain("Tool activity");
    expect(html).not.toContain("No source references");
  });

  it("renders a table and a code block at their full height, never inside a capped box", () => {
    const html = render(
      turn("completed", {
        messages: [
          {
            messageId: "synthetic-table",
            text: "| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n\nAfter.",
          },
        ],
      }),
    );
    expect(html).toContain("<table");
    expect(html).toContain("<pre");
    expect(html).not.toContain("max-height");
  });

  it("keeps a pill only for states that need attention and a quiet indicator while running", () => {
    expect(render(turn("failed"))).toContain(
      'data-tone="danger">Failed</span>',
    );
    expect(render(turn("cancelled"))).toContain(
      'data-tone="warning">Cancelled</span>',
    );
    expect(render(turn("paused"))).toContain(
      'data-tone="warning">Paused</span>',
    );
    expect(render(turn("waiting-for-approval"))).toContain(
      'data-tone="warning">Waiting for approval</span>',
    );
    for (const state of ["queued", "starting", "running"] as const) {
      const html = render(turn(state));
      expect(html).toContain("Meri is working");
      expect(html).not.toContain("data-tone=");
    }
  });

  it("explains a failed run in plain words, keeps an unknown code small, and says nothing for other states", () => {
    const known = render(turn("failed", { reasonCode: "EXECUTION_FAILED" }));
    expect(known).toContain(
      "Meri could not finish this answer. Send it again, or rephrase.</p>",
    );
    expect(known).not.toContain("EXECUTION_FAILED");
    expect(known).not.toContain("Service reason");
    for (const code of ["HOLD_CHECKPOINT_FAILED", "ATTEMPT_LOST"])
      expect(render(turn("failed", { reasonCode: code }))).toContain(
        "Meri lost this answer before it finished. Send it again.</p>",
      );
    const reason = { reasonCode: "SYNTHETIC_REASON" };
    const unknown = render(turn("failed", reason));
    expect(unknown).toContain(
      "Meri could not finish this answer. Send it again.<small> SYNTHETIC_REASON</small></p>",
    );
    for (const state of ["completed", "cancelled", "running"] as const)
      expect(render(turn(state, reason))).not.toContain("could not finish");
    const silent = render(turn("completed", { prompt: null }));
    expect(silent).not.toContain("was not returned");
    expect(silent).toContain("Synthetic answer.");
  });
});

describe("audit material stays behind one closed disclosure", () => {
  it("renders nothing when no run saved a source, ran a tool or recorded usage", () => {
    expect(evidence(turn("completed"), [turn("completed")])).toBe("");
    expect(evidence(null)).toBe("");
  });

  it("offers recorded usage only once a usage record was announced for the run", () => {
    const html = evidence(turn("completed", { usageIds: ["synthetic-usage"] }));
    expect(html).toMatch(/^<details/);
    expect(html).toContain("Sources &amp; usage");
    expect(html).not.toContain(" open");
    expect(html).toContain("View recorded usage");
    expect(html).not.toContain("<h2");
    expect(evidence(turn("completed", { usageIds: [] }))).not.toContain(
      "View recorded usage",
    );
  });

  it("names runs only when more than one has something to show", () => {
    const withTools = turn("completed", {
      tools: [{ requestId: "r", name: "Synthetic read", resultReference: "x" }],
    });
    const html = evidence(withTools, [
      turn("completed"),
      { ...withTools, runId: "30000000-0000-4000-8000-000000000002" },
    ]);
    expect(html).toContain("Earlier run 2");
    expect(html).toContain("Current run");
    expect(html).not.toContain("Earlier run 1");
    expect(html.match(/Tool activity/g)).toHaveLength(2);
  });

  it("keeps a finished run's checkpoint inside the same disclosure", () => {
    const html = evidence(turn("completed"), [], "synthetic checkpoint slot");
    expect(html).toMatch(/^<details/);
    expect(html).toContain("synthetic checkpoint slot");
  });
});

describe("run controls appear only while there is something to control or recover", () => {
  const controls = (view: TurnView | null, lifecycle = idle()) =>
    renderToStaticMarkup(
      createElement(RunLifecycleControls, {
        lifecycle,
        turn: view,
        disabled: false,
      }),
    );

  it("renders nothing for a finished run, even one with a verified checkpoint", () => {
    for (const state of ["completed", "failed", "cancelled"] as const)
      expect(
        controls(turn(state, { checkpointIds: ["synthetic-checkpoint"] })),
      ).toBe("");
    expect(controls(null)).toBe("");
  });

  it("offers Pause and a closed Steer affordance inline while a run is running", () => {
    const html = controls(turn("running"));
    expect(html).not.toContain("<details");
    expect(html).not.toContain("Pause or steer this run");
    expect(html).toContain(">Pause</button>");
    expect(html).toMatch(
      /<button[^>]*aria-expanded="false"[^>]*>Steer<\/button>/,
    );
    // The guidance field opens on demand; nothing is typed into until then.
    expect(html).not.toContain("Steer this run");
    expect(html).not.toContain("Send guidance");
    expect(html).not.toContain("No verified checkpoint");
    expect(html).not.toContain("Leaving this page");
  });

  it("renders beside the working status inside the current answer's heading", () => {
    const html = renderToStaticMarkup(
      createElement(ConversationTurn, {
        turn: turn("running"),
        label: "Current turn",
        controls: createElement("span", null, "synthetic run controls"),
      }),
    );
    const heading = html.slice(
      html.indexOf("Meri is working"),
      html.indexOf("synthetic run controls"),
    );
    expect(heading.length).toBeGreaterThan(0);
    // One status container holds the working text and the controls: no transcript markup between.
    expect(heading).not.toContain("<p");
    expect(html.indexOf("synthetic run controls")).toBeLessThan(
      html.indexOf("Synthetic answer."),
    );
  });

  it("sends only trimmed guidance as a steer control", () => {
    expect(guidanceCommand("  keep the selected window  ")).toEqual({
      intent: "steer",
      text: "keep the selected window",
    });
    for (const empty of ["", "   ", "\n\t"])
      expect(guidanceCommand(empty)).toBeUndefined();
  });

  it("keeps a paused run, a pending control and an error in plain view", () => {
    const paused = controls(turn("paused"));
    expect(paused).toContain("No verified checkpoint is available yet.");
    expect(paused).not.toContain(">Pause</button>");
    const pending = controls(
      turn("completed"),
      idle({ command: { controlId: "c", intent: "pause" } as never }),
    );
    expect(pending).toContain("Retry same control");
    const failed = controls(
      turn("completed"),
      idle({ error: "Synthetic lifecycle error" }),
    );
    expect(failed).toContain("Synthetic lifecycle error");
  });

  it("lets a finished run inspect and then fork its checkpoint from the disclosure", () => {
    const inspect = vi.fn();
    const html = renderToStaticMarkup(
      createElement(CheckpointActions, {
        lifecycle: idle({
          inspect,
          checkpoint: {
            checkpointId: "synthetic-checkpoint",
            checkpointSha256: "a".repeat(64),
          } as never,
        }),
        checkpointId: "synthetic-checkpoint",
        disabled: false,
      }),
    );
    // The inspection entry is a quiet text link inside the details, not the shared button.
    expect(html).toMatch(
      /<button type="button" class="[^"]*textLink[^"]*"[^>]*>Inspect latest checkpoint<\/button>/,
    );
    expect(html).toContain("Progress saved.");
    expect(html).not.toContain("Checkpoint verified");
    expect(html).toContain("Fork into new chat");
    expect(html).not.toContain(">Resume</button>");
  });
});

it("the conversation frame announces nothing when there is no history status", () => {
  const frame: ComponentProps<typeof ConversationFrame> = {
    scope: "Synthetic scope",
    children: null,
    composer: null,
    historyStatus: null,
  };
  const html = renderToStaticMarkup(createElement(ConversationFrame, frame));
  expect(html).not.toContain("Saved history requires");
  expect(html).not.toContain("Reconnect to read earlier turns");
});

describe("a finished answer names the model that produced it", () => {
  const selection = {
    provider: "bedrock",
    modelId: "synthetic-model",
    effort: "high",
  } as const;
  const provided = (view: TurnView, catalog: typeof modelCatalog | undefined) =>
    renderToStaticMarkup(
      createElement(
        ModelCatalogContext.Provider,
        { value: catalog },
        createElement(ConversationTurn, { turn: view, label: "Current turn" }),
      ),
    );
  const labelled = (view: TurnView) => provided(view, modelCatalog);

  it("shows the catalog label and the picker's effort label, never the raw model id", () => {
    const html = labelled(turn("completed", { modelSelection: selection }));
    expect(html).toContain("Synthetic model · High");
    expect(html).not.toContain("synthetic-model");
    expect(html).not.toContain("data-tone=");
    expect(
      labelled(
        turn("completed", { modelSelection: { ...selection, effort: null } }),
      ),
    ).toContain("Synthetic model · Model default");
  });

  it("stays hidden when the record has no selection, the catalog lacks the model or the run is not finished", () => {
    expect(labelled(turn("completed"))).not.toContain("Synthetic model");
    expect(
      labelled(
        turn("completed", {
          modelSelection: { ...selection, modelId: "synthetic-unlisted" },
        }),
      ),
    ).not.toContain("synthetic-unlisted");
    // The catalog has not loaded: the admitted selection waits rather than showing a raw id.
    expect(
      provided(turn("completed", { modelSelection: selection }), undefined),
    ).not.toContain("Synthetic model");
    for (const state of ["running", "failed", "cancelled"] as const)
      expect(
        labelled(turn(state, { modelSelection: selection })),
      ).not.toContain("Synthetic model");
    expect(
      render(turn("completed", { modelSelection: selection })),
    ).not.toContain("Synthetic model");
  });

  it("carries the admitted request's selection into a saved turn and labels it", () => {
    // Only the already-admitted fields consumed by the saved-turn fold.
    const saved = (request: Record<string, unknown>) =>
      savedTurns({
        latest: {},
        turns: [
          {
            run: { binding, state: "completed" },
            request: { prompt: "Synthetic saved question", ...request },
            promptLineage: { logicalRequestId: "synthetic-request" },
            lastSequence: 0,
          },
        ],
        events: [],
      } as unknown as NonNullable<Parameters<typeof savedTurns>[0]>)[0]!;
    const withModel = saved({ modelSelection: selection });
    expect(withModel.modelSelection).toEqual(selection);
    expect(
      labelled({ ...withModel, messages: turn("completed").messages }),
    ).toContain("Synthetic model · High");
    const without = saved({});
    expect("modelSelection" in without).toBe(false);
    expect(runModelLabel(modelCatalog, without.modelSelection)).toBeUndefined();
  });
});
