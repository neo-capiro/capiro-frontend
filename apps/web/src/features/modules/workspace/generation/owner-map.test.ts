import { expect, it } from "vitest";
import { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";
import {
  advertisedGenerationActions,
  isMountedGenerationOperation,
  isNativeGenerationOperation,
  mountedGenerationOperations,
  nativeGenerationOperations,
  wiredGenerationActions,
  withheldGenerationActions,
} from "./owner-map";

// The owner map is the WS-22 acceptance artifact: every advertised document-agent
// action, and the approved Workspace owner that serves it. This test keeps it in
// exact step with the declared operations, so a route cannot be wired without an
// owner and a model-backed route cannot be wired at all.

it("wires only Workspace-owned operations and withholds every model-backed one", () => {
  const wired = wiredGenerationActions();
  expect(wired.length).toBeGreaterThan(0);
  for (const entry of wired) {
    const operation = entry.operation;
    if (!operation)
      throw new Error(`${entry.action} is wired without an operation`);
    expect(workspaceGenerationOperations[operation].method, entry.action).toBe(
      entry.method,
    );
    expect(workspaceGenerationOperations[operation].path, entry.action).toBe(
      entry.path,
    );
    expect(entry.owner, entry.action).not.toBe("meri-greenfield");
  }
  for (const entry of withheldGenerationActions()) {
    expect(entry.withheldReason, entry.action).toBeTruthy();
    // Every remaining withheld action is an unbridged greenfield Meri phase. The
    // durable intake is wired: its run's drafting stage is served by the
    // greenfield native conversation owner, so withholding it would leave a dead
    // control over an approved owner.
    expect(entry.owner, entry.action).toBe("meri-greenfield");
  }
});

it("mounts the durable intake submit and its run continuation with their reads", () => {
  const mounted = [...mountedGenerationOperations()];
  expect(mounted).toContain("workspace.generation.intake.capability");
  expect(mounted).toContain("workspace.generation.intake");
  expect(mounted).toContain("workspace.generation.run.status");
  // The run continuation is served by the same approved durable-intake owner as
  // the intake and the run read, so it is mounted with its own operation.
  expect(mounted).toContain("workspace.generation.run.retryFailed");
  const retry = wiredGenerationActions().find(
    (entry) => entry.action === "run.retryFailed",
  );
  expect(retry?.operation).toBe("workspace.generation.run.retryFailed");
  expect(retry?.owner).toBe("workspace-durable-intake");
  // The DOCUMENT retry is now mounted on the greenfield native owner with its own
  // operation, so a mounted control for it dispatches the native route and nothing
  // reaches the legacy provider path through it.
  const document = wiredGenerationActions().find(
    (entry) => entry.action === "generation.retry",
  );
  expect(document?.operation).toBe("workspace.generation.document.retry");
  expect(document?.owner).toBe("workspace-native-retry");
  expect(document?.withheldReason).toBeUndefined();
});

it("mounts the five supported generated phases on the greenfield native owner", () => {
  const mounted = new Set(mountedGenerationOperations());
  const native = nativeGenerationOperations();
  for (const operation of [
    "workspace.generation.brief.synthesize",
    "workspace.generation.context.recommend",
    "workspace.generation.context.analyze",
    "workspace.generation.outline.generate",
    "workspace.generation.generate",
  ] as const) {
    expect(mounted.has(operation), operation).toBe(true);
    expect(native.has(operation), operation).toBe(true);
    expect(isNativeGenerationOperation(operation), operation).toBe(true);
  }
  for (const entry of wiredGenerationActions())
    if (native.has(entry.operation as never))
      expect(entry.owner, entry.action).toBe("workspace-native-generation");
});

it("declares exactly the operations the owner map accounts for", () => {
  const declared = [...Object.keys(workspaceGenerationOperations)].sort();
  const accounted = new Set<string>(mountedGenerationOperations());
  for (const entry of withheldGenerationActions())
    if (entry.operation) accounted.add(entry.operation);
  expect([...accounted].sort()).toEqual(declared);
  // The durable intake is declared with its required request identity and is
  // mounted: its run's drafting stage is served by the greenfield native
  // conversation owner, so the submit is a real greenfield generation.
  expect(declared).toContain("workspace.generation.intake");
  expect(isMountedGenerationOperation("workspace.generation.intake")).toBe(true);
});

it("accounts for every advertised action exactly once", () => {
  const accounted = [
    ...wiredGenerationActions(),
    ...withheldGenerationActions(),
  ].map((entry) => entry.action);
  expect(new Set(accounted).size).toBe(advertisedGenerationActions.length);
  expect(accounted).toHaveLength(advertisedGenerationActions.length);
});

it("covers the actions the WS-22 ticket advertises", () => {
  const accounted = advertisedGenerationActions.map((entry) => entry.action);
  for (const action of [
    "catalog",
    "recommend",
    "initialize",
    "state",
    "messages",
    "brief.edit",
    "brief.synthesize",
    "brief.approve",
    "brief.reopen",
    "context.recommend",
    "context.analyze",
    "context.resolve",
    "context.approve",
    "outline.generate",
    "outline.edit",
    "outline.revise",
    "outline.approve",
    "proposal.accept",
    "proposal.reject",
    "generation.status",
    "generation.retry",
    "generation.cancel",
    "quality.fix",
    "intake.submit",
    "run.status",
    "run.retryFailed",
  ])
    expect(accounted, action).toContain(action);
});

it("keeps every model-backed action WITHOUT a greenfield owner withheld", () => {
  const withheld = withheldGenerationActions().map((entry) => entry.action);
  for (const action of ["recommend", "message.send"])
    expect(withheld, action).toContain(action);
  // The document retry now HAS a greenfield native owner, so it is mounted rather
  // than withheld.
  expect(withheld).not.toContain("generation.retry");
  // The run continuation is wired: its route is served by the approved
  // durable-intake owner and reaches the legacy provider path for no run this
  // consumer may name.
  expect(withheld).not.toContain("run.retryFailed");
  // The five supported generated phases are wired, not withheld: their greenfield
  // native owner exists now, so withholding them would leave a dead control.
  const wired = wiredGenerationActions().map((entry) => entry.action);
  for (const action of [
    "brief.synthesize",
    "context.recommend",
    "context.analyze",
    "outline.generate",
    "generation.generate",
  ]) {
    expect(wired, action).toContain(action);
    expect(withheld, action).not.toContain(action);
  }
});
