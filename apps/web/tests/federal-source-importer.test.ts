import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { FederalSourceImporter } from "../src/features/meri/files/FederalSourceImporter";
import type {
  FederalWorkbenchPort,
  FederalSourceView,
} from "../src/shared/meri-documents/federal-workbench";
import fixture from "./fixtures/federal-raw-source.json";
import schemaFixture from "./fixtures/federal-schema-source.json";
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
  value?: string;
  onClick?: () => void;
  onChange?: (event: { target: { value: string } }) => void;
};
let nodes: ReactElement<Props>[],
  unresolved: boolean,
  running: boolean,
  errors: unknown[];
const imported = vi.fn(),
  pending = vi.fn(),
  importSource = vi.fn();
const signal = new AbortController().signal;
let selection = fixture.input.selection;
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
              selection,
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
const mode = () => nodes.find((node) => node.type === "select")!;
async function chooseMode(value: string) {
  mode().props.onChange!({ target: { value } });
  await flush();
}
async function click(text: string) {
  expect(button(text).props.disabled).not.toBe(true);
  button(text).props.onClick!();
  await flush();
}
beforeEach(() => {
  hooks.slots = [];
  selection = fixture.input.selection;
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
    undefined,
  );
  await chooseMode("raw");
  await click("Import this bill version");
  expect(importSource).toHaveBeenLastCalledWith(
    fixture.input.selection,
    signal,
    "retained-raw-utf8/1",
    undefined,
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
  expect(nodes.some((node) => label(node).includes("Passed pinned USLM"))).toBe(
    false,
  );
});
it("requests pinned USLM validation and displays the exact admitted source receipt", async () => {
  selection = schemaFixture.input.selection;
  const schemaSource = {
    versionId: schemaFixture.imported.publication.version.versionId,
    sha256: schemaFixture.imported.publication.version.object.sha256,
    source: schemaFixture.imported.source,
    capture: schemaFixture.imported.capture,
  } as FederalSourceView;
  importSource.mockResolvedValueOnce(schemaSource);
  await click("Browse cited bill versions");
  await chooseMode("uslm");
  await click("Import this bill version");
  expect(importSource).toHaveBeenLastCalledWith(
    selection,
    signal,
    "retained-raw-utf8/1",
    "uslm-2.1.0",
  );
  expect(imported).toHaveBeenLastCalledWith(schemaSource);
  const paragraphs = nodes
    .filter((node) => node.type === "p")
    .map(label)
    .join("\n");
  expect(paragraphs).toContain("Passed pinned USLM 2.1 syntax validation");
  for (const value of [
    schemaFixture.imported.source.validation.profile,
    schemaFixture.imported.source.validation.schemaSha256,
    schemaFixture.imported.source.validation.sourceSha256,
    String(schemaFixture.imported.source.validation.bytes),
    selection.revisionId,
  ])
    expect(paragraphs).toContain(value);
  expect(paragraphs).toMatch(/syntax, not legal correctness/);
  expect(errors).toEqual([]);
});
it.each(["raw", "uslm"])(
  "holds the %s mode while the original import is unresolved",
  async (selected) => {
    await click("Browse cited bill versions");
    await chooseMode(selected);
    importSource.mockImplementationOnce(async () => {
      unresolved = true;
      throw Error("Synthetic unknown outcome");
    });
    await click("Import this bill version");
    expect(mode().props.disabled).toBe(true);
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
    expect(importSource.mock.calls.map((call) => call[3])).toEqual([
      selected === "uslm" ? "uslm-2.1.0" : undefined,
      selected === "uslm" ? "uslm-2.1.0" : undefined,
    ]);
    expect(pending).toHaveBeenLastCalledWith(false);
    expect(errors).toHaveLength(1);
  },
);
it.each(["raw", "uslm"])(
  "reports a definite %s refusal without automatically weakening checks",
  async (selected) => {
    await click("Browse cited bill versions");
    await chooseMode(selected);
    importSource.mockRejectedValueOnce(
      Error("Synthetic raw capture unavailable"),
    );
    await click("Import this bill version");
    expect(importSource).toHaveBeenCalledTimes(1);
    expect(imported).not.toHaveBeenCalled();
    expect(pending).toHaveBeenLastCalledWith(false);
    expect(mode().props.disabled).toBe(false);
    expect(errors).toHaveLength(1);
  },
);
