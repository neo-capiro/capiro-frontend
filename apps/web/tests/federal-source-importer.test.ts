import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { FederalSourceImporter } from "../src/features/meri/files/FederalSourceImporter";
import type {
  FederalWorkbenchPort,
  FederalSourceView,
} from "../src/shared/meri-documents/federal-workbench";
import fixture from "./fixtures/federal-raw-source.json";
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  dirty: false,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [
      hooks.slots[index],
      (value: unknown) => {
        hooks.slots[index] = value;
        hooks.dirty = true;
      },
    ];
  },
}));
type Props = {
  children?: ReactNode;
  disabled?: boolean;
  type?: string;
  checked?: boolean;
  onClick?: () => void;
  onChange?: (event: { target: { checked: boolean } }) => void;
};
let nodes: ReactElement<Props>[],
  unresolved: boolean,
  running: boolean,
  errors: unknown[];
const imported = vi.fn(),
  pending = vi.fn(),
  importSource = vi.fn();
const signal = new AbortController().signal;
const source = {
  versionId: fixture.imported.publication.version.versionId,
  sha256: fixture.imported.publication.version.object.sha256,
  source: fixture.imported.source,
  capture: fixture.imported.capture,
} as FederalSourceView;
function label(value: ReactNode): string {
  if (Array.isArray(value)) return value.map(label).join("");
  if (value && typeof value === "object" && "props" in value)
    return label((value as ReactElement<Props>).props.children);
  return value == null || typeof value === "boolean" ? "" : String(value);
}
function visit(value: ReactNode) {
  if (Array.isArray(value)) return value.forEach(visit);
  if (value && typeof value === "object" && "props" in value) {
    nodes.push(value as ReactElement<Props>);
    visit((value as ReactElement<Props>).props.children);
  }
}
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  nodes = [];
  visit(
    FederalSourceImporter({
      port: {
        unresolved: () => unresolved,
        importSource,
        sources: async () => ({
          sources: [
            {
              eventId: "synthetic-citation",
              selection: fixture.input.selection,
            },
          ],
          nextAfter: null,
        }),
      } as unknown as FederalWorkbenchPort,
      disabled: false,
      signal: () => signal,
      onImported: imported,
      onPending: pending,
      run: async (action) => {
        running = true;
        try {
          await action();
        } catch (error) {
          errors.push(error);
        } finally {
          running = false;
        }
      },
    }),
  );
}
async function flush() {
  await vi.waitFor(
    () => {
      if (hooks.dirty) render();
      expect(running).toBe(false);
    },
    { interval: 1 },
  );
  if (hooks.dirty) render();
}
const button = (text: string) =>
  nodes.find((node) => node.props.onClick && label(node) === text)!;
const checkbox = () =>
  nodes.find(
    (node) => node.type === "input" && node.props.type === "checkbox",
  )!;
async function click(text: string) {
  expect(button(text).props.disabled).not.toBe(true);
  button(text).props.onClick!();
  await flush();
}
beforeEach(() => {
  hooks.slots = [];
  unresolved = false;
  running = false;
  errors = [];
  imported.mockReset();
  pending.mockReset();
  importSource.mockReset().mockResolvedValue(source);
  render();
});
it("keeps ordinary retained import as default and forwards the explicit raw choice", async () => {
  await click("Browse cited bill versions");
  await click("Import this bill version");
  expect(importSource).toHaveBeenLastCalledWith(
    fixture.input.selection,
    signal,
    undefined,
  );
  checkbox().props.onChange!({ target: { checked: true } });
  await flush();
  await click("Import this bill version");
  expect(importSource).toHaveBeenLastCalledWith(
    fixture.input.selection,
    signal,
    "retained-raw-utf8/1",
  );
  expect(imported).toHaveBeenLastCalledWith(source);
  expect(
    nodes.some(
      (node) =>
        node.type === "summary" && label(node) === "Verified source capture",
    ),
  ).toBe(true);
  expect(
    nodes.some(
      (node) =>
        node.type === "p" &&
        label(node).includes(fixture.imported.capture.sha256),
    ),
  ).toBe(true);
});
it("holds the chosen representation while the original import is unresolved", async () => {
  await click("Browse cited bill versions");
  checkbox().props.onChange!({ target: { checked: true } });
  await flush();
  importSource.mockImplementationOnce(async () => {
    unresolved = true;
    throw Error("Synthetic unknown outcome");
  });
  await click("Import this bill version");
  expect(checkbox().props.disabled).toBe(true);
  expect(imported).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(true);
  importSource.mockImplementationOnce(async () => {
    unresolved = false;
    return source;
  });
  await click("Recover selected source import");
  expect(importSource.mock.calls.map((call) => call[2])).toEqual([
    "retained-raw-utf8/1",
    "retained-raw-utf8/1",
  ]);
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(errors).toHaveLength(1);
});
it("reports a definite refusal without automatically trying extracted text", async () => {
  await click("Browse cited bill versions");
  checkbox().props.onChange!({ target: { checked: true } });
  await flush();
  importSource.mockRejectedValueOnce(
    Error("Synthetic raw capture unavailable"),
  );
  await click("Import this bill version");
  expect(importSource).toHaveBeenCalledTimes(1);
  expect(imported).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(false);
  expect(checkbox().props.disabled).toBe(false);
  expect(errors).toHaveLength(1);
});
