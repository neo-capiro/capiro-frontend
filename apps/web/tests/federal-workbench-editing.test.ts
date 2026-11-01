import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type {
  AdmittedFederalReview,
  FederalSelection,
} from "@capiro/meri-contracts/federal-workbench";
import { FederalWorkbench } from "../src/features/meri/files/FederalWorkbench";
import { FederalAmendmentList } from "../src/features/meri/files/FederalAmendmentList";
import {
  authoredOperations,
  type AuthoredInput,
} from "../src/shared/meri-documents/federal-authoring";
import type { FederalWorkbenchPort } from "../src/shared/meri-documents/federal-workbench";
import fixture from "./fixtures/federal-workbench.json";

// Exercise actual component callbacks and authoring, with synthetic port results.
// Receiver/compiler admission remains covered by the existing federal suites.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  dirty: false,
  effects: [] as Array<() => void | (() => void)>,
  cleanups: [] as Array<() => void>,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useId: () => "synthetic-workbench",
  useRef(value: unknown) {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = { current: value };
    return hooks.slots[i];
  },
  useState(value: unknown) {
    const i = hooks.cursor++;
    if (!(i in hooks.slots))
      hooks.slots[i] = typeof value === "function" ? value() : value;
    return [
      hooks.slots[i],
      (next: unknown) => {
        hooks.slots[i] =
          typeof next === "function" ? next(hooks.slots[i]) : next;
        hooks.dirty = true;
      },
    ];
  },
  useEffect(effect: () => void | (() => void)) {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) {
      hooks.slots[i] = true;
      hooks.effects.push(effect);
    }
  },
}));

type Props = {
  children?: ReactNode;
  value?: string;
  disabled?: boolean;
  checked?: boolean;
  role?: string;
  type?: string;
  "aria-label"?: string;
  onClick?: (event: { currentTarget: { value?: string } }) => void;
  onChange?: (event: { target: { value: string; checked: boolean } }) => void;
  onSubmit?: (event: { preventDefault: () => void }) => void;
};
let nodes: ReactElement<Props>[], port: FederalWorkbenchPort;
let saved: AdmittedFederalReview;
const publish = vi.fn(),
  prepare = vi.fn();
function label(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(label).join("");
  if (node && typeof node === "object" && "props" in node)
    return label((node as ReactElement<Props>).props.children);
  return node == null || typeof node === "boolean" ? "" : String(node);
}
function visit(node: ReactNode) {
  if (Array.isArray(node)) return node.forEach(visit);
  if (!node || typeof node !== "object" || !("props" in node)) return;
  const element = node as ReactElement<Props>;
  nodes.push(element);
  visit(element.props.children);
}
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  nodes = [];
  visit(FederalWorkbench({ port }));
  hooks.effects.splice(0).forEach((effect) => {
    const cleanup = effect();
    if (cleanup) hooks.cleanups.push(cleanup);
  });
}
async function flush() {
  await vi.waitFor(
    () => {
      if (hooks.dirty) render();
      expect(
        button("Browse source files and saved reviews")!.props.disabled,
      ).toBe(false);
    },
    { interval: 1 },
  );
  if (hooks.dirty) render();
}
const button = (text: string) =>
  nodes.find((node) => node.props.onClick && label(node) === text);
const list = () =>
  nodes.find((node) => node.type === FederalAmendmentList)!
    .props as ComponentProps<typeof FederalAmendmentList>;
async function click(text: string) {
  const node = button(text)!;
  expect(node, text).toBeDefined();
  expect(node.props.disabled, text).not.toBe(true);
  node.props.onClick!({ currentTarget: { value: node.props.value } });
  await flush();
}
async function field(text: string, value: string) {
  nodes.find((node) => node.props["aria-label"] === text)!.props.onChange!({
    target: { value, checked: false },
  });
  await flush();
}
async function add(expected: string, text: string) {
  await field("Exact text to find", expected);
  await field("New text", text);
  await click("Add amendment to review");
}
async function chooseScope(value: string) {
  nodes.find(
    (node) =>
      node.type === "select" && node.props.value?.startsWith("section-"),
  )!.props.onChange!({ target: { value, checked: false } });
  await flush();
}
async function prepareReview() {
  nodes.find((node) => node.type === "form")!.props.onSubmit!({
    preventDefault() {},
  });
  await flush();
}
async function confirm() {
  nodes.find((node) => node.type === "input" && node.props.type === "checkbox")!
    .props.onChange!({ target: { value: "", checked: true } });
  await flush();
}
const input = (
  id: string,
  scopeId: string,
  expectedText: string,
  text: string,
): AuthoredInput => ({ id, scopeId, kind: "replace", expectedText, text });
async function loadChain() {
  const value = await authoredOperations(saved.prepared.draft.source, [
    input("retained-first", "section-1", "$100", "$150"),
    input("retained-second", "section-1", "$150", "$250"),
  ]);
  saved = {
    ...saved,
    selection: {
      ...saved.selection,
      operations: [...value.operations] as FederalSelection["operations"],
    },
  };
  await click("Open saved review");
}
beforeEach(async () => {
  hooks.slots = [];
  hooks.effects = [];
  hooks.cleanups = [];
  hooks.dirty = false;
  saved = structuredClone(fixture.review) as unknown as AdmittedFederalReview;
  publish.mockReset().mockResolvedValue({
    publication: { version: { filename: "synthetic.txt" } },
  });
  prepare
    .mockReset()
    .mockImplementation(async (selection: FederalSelection) => ({
      ...saved,
      selection,
    }));
  port = {
    unresolved: () => false,
    library: {
      list: async () => ({
        ok: true,
        value: {
          versions: [
            {
              versionId: "saved",
              filename: "synthetic.txt",
              mimeType: "text/plain",
              object: { sha256: "synthetic" },
            },
          ],
          nextCursor: null,
        },
      }),
    },
    source: async () => ({
      source: fixture.source,
      versionId: saved.selection.versionId,
      sha256: saved.selection.expectedArtifactSha256,
    }),
    load: async () => saved,
    prepare,
    publish,
  } as unknown as FederalWorkbenchPort;
  render();
  await click("Browse source files and saved reviews");
});
afterEach(() => hooks.cleanups.forEach((cleanup) => cleanup()));

it("clears confirmed outputs and stale hashes when removing a prerequisite refuses", async () => {
  await loadChain();
  await confirm();
  await click("Export consolidated");
  expect(button("Get verified file")).toBeDefined();
  list().onRemove(list().drafts[0]!);
  await flush();
  expect(list().drafts.map((entry) => entry.id)).toEqual(["retained-second"]);
  expect(list().operations).toEqual([]);
  expect(
    nodes.some(
      (node) =>
        node.props.role === "alert" &&
        label(node).includes("not in the selected section"),
    ),
  ).toBe(true);
  expect(button("Export consolidated")).toBeUndefined();
  expect(button("Save review revision")).toBeUndefined();
  expect(button("Get verified file")).toBeUndefined();
  expect(
    nodes.find((node) => node.props.type === "submit")!.props.disabled,
  ).toBe(true);
  await prepareReview();
  expect(prepare).not.toHaveBeenCalled();
  expect(publish).toHaveBeenCalledTimes(1);
});

it.each([0, 1])(
  "allocates a unique identity after removing operation %s then adding",
  async (removed) => {
    await click("Open source");
    await add("$100", "$150");
    await chooseScope("section-2");
    await add("$100", "$250");
    const old = list().drafts.map((entry) => entry.id);
    list().onRemove(list().drafts[removed]!);
    await flush();
    await chooseScope(removed === 0 ? "section-1" : "section-2");
    await add("$100", "$350");
    const operations = list().operations;
    expect(new Set(operations.map((entry) => entry.id)).size).toBe(2);
    expect(old).not.toContain(operations[1]!.id);
    expect(
      operations.every((entry) => !entry.dependsOn.includes(entry.id)),
    ).toBe(true);
    await prepareReview();
    await confirm();
    await click("Export consolidated");
    expect(publish.mock.lastCall![0].selection.operations).toEqual(operations);
  },
);

it("replaces an earlier loaded amendment in place and recomputes its dependent tail", async () => {
  await loadChain();
  const previous = list().operations;
  list().onEdit(list().drafts[0]!);
  await flush();
  await field("New text", "$175");
  await click("Update amendment");
  expect(list().operations).toEqual(previous);
  expect(list().drafts[0]!.text).toBe("$150");
  expect(button("Export consolidated")!.props.disabled).toBe(true);
  await field("New text", "$150 payable");
  await click("Update amendment");
  expect(list().drafts.map((entry) => entry.id)).toEqual([
    "retained-first",
    "retained-second",
  ]);
  expect(list().operations[1]!.dependsOn).toEqual(["retained-first"]);
  expect(list().operations[1]!.expectedScopeSha256).not.toBe(
    previous[1]!.expectedScopeSha256,
  );
  await prepareReview();
  expect(prepare.mock.lastCall![2]).toBe(saved);
  await confirm();
  await click("Export consolidated");
  expect(publish.mock.lastCall![0].selection.operations).toEqual(
    list().operations,
  );
});

it.each(["Cancel edit", "Update amendment"])(
  "%s preserves a confirmed loaded revision when the edit does not commit a change",
  async (action) => {
    await loadChain();
    await confirm();
    list().onEdit(list().drafts[0]!);
    await flush();
    if (action === "Cancel edit") await field("New text", "$999");
    await click(action);
    expect(list().drafts[0]!.text).toBe("$150");
    await click("Export consolidated");
    expect(publish.mock.lastCall![0]).toBe(saved);
    expect(prepare).not.toHaveBeenCalled();
  },
);

it("keeps independent sibling hashes unchanged when an earlier amendment is edited", async () => {
  await click("Open source");
  await add("$100", "$150");
  await chooseScope("section-2");
  await add("$100", "$250");
  const sibling = list().operations[1];
  list().onEdit(list().drafts[0]!);
  await flush();
  await field("New text", "$175");
  await click("Update amendment");
  expect(list().operations[1]).toEqual(sibling);
  expect(list().operations[0]!.text).toBe("$175");
});

it("preserves exact imported operations for an untouched nested review and refuses stale hashes after removal", async () => {
  await loadChain();
  const source = saved.prepared.draft.source;
  const start = source.text.indexOf("$100");
  saved = {
    ...saved,
    prepared: {
      ...saved.prepared,
      draft: {
        ...saved.prepared.draft,
        source: {
          ...source,
          parserVersion: "federal-scoped-text/2",
          scopes: [
            { ...source.scopes[0]!, ancestorPath: [] },
            {
              ...source.scopes[0]!,
              id: "nested",
              start,
              end: start + 4,
              ancestorPath: ["section-1"],
            },
          ],
        },
      },
    },
    selection: {
      ...saved.selection,
      operations: [
        saved.selection.operations[0],
        { ...saved.selection.operations[1]!, scopeId: "nested" },
      ],
    },
  } as AdmittedFederalReview;
  await click("Open saved review");
  expect(list().operations).toEqual(saved.selection.operations);
  await confirm();
  await click("Export consolidated");
  expect(publish.mock.lastCall![0]).toBe(saved);
  list().onRemove(list().drafts[0]!);
  await flush();
  expect(list().drafts).toHaveLength(1);
  expect(list().operations).toEqual([]);
  expect(button("Export consolidated")).toBeUndefined();
});
