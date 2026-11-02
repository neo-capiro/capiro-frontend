import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OfficeDocumentScreen } from "../src/features/modules/workspace/office/OfficeDocumentScreen";
import { OfficeDraftControls } from "../src/features/modules/workspace/office/OfficeDraftControls";
import { libraryRows } from "../src/features/meri/files/DocumentLibrary";
import { LibrarySelectedVersion } from "../src/features/meri/files/LibrarySelectedVersion";
import type { OfficeEditorState } from "../src/shared/meri-office/editor-controller";
import type { LibraryVersion } from "../src/shared/meri-documents/library-access";
import { officeWireSnapshot } from "./office-wire-fixture";
import { conversationId, viewer } from "./office-edit-fixture";

const h = vi.hoisted(() => ({
  head: null as { latest: boolean; headVersionId: string } | null,
  state: null as unknown,
  open: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  /** The handlers the screen hands the workbench, captured for the guard's navigation. */
  handlers: null as null | { navigate(href: string): void },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.push, replace: h.replace }),
}));
vi.mock("../src/features/modules/workspace/office/useOfficeWorkbench", () => ({
  useOfficeWorkbench: (
    _account: unknown,
    _target: unknown,
    handlers: { navigate(href: string): void },
  ) => {
    h.handlers = handlers;
    return workbench();
  },
}));
const workbench = () => ({
  host: {
    editor: {
      open: h.open,
      close: vi.fn(),
      publish: vi.fn(),
      publishRevision: vi.fn(),
      recover: vi.fn(),
      discard: vi.fn(),
      ownsEditor: () => true,
    },
    session: { connect: vi.fn() },
    navigate: vi.fn(),
  },
  state: h.state,
  connection: {
    status: "ready",
    port: { request: vi.fn(), history: vi.fn(), download: vi.fn() },
    lifetimeKey: "k",
  },
  container: { current: null },
  head: h.head,
  history: { open: false, setOpen: vi.fn() },
});
const editorState = (patch: Partial<OfficeEditorState>): OfficeEditorState => ({
  connected: true,
  busy: null,
  snapshot: { ...officeWireSnapshot(), launch: null },
  publication: null,
  frame: true,
  ready: true,
  modified: false,
  uncertain: false,
  notice: "",
  mode: "edit",
  saving: false,
  ...patch,
});
const target = {
  versionId: "11111111-1111-4111-8111-111111111111",
  conversationId,
  clientId: null,
};
const screen = () =>
  renderToStaticMarkup(
    createElement(OfficeDocumentScreen, {
      account: viewer,
      target,
      onClose: () => {},
      onOpenVersion: () => {},
    }),
  );

describe("Office document screen", () => {
  it("an earlier revision is shown read-only with the way to the latest, and no editing or publishing action", () => {
    h.head = {
      latest: false,
      headVersionId: "22222222-2222-4222-8222-222222222222",
    };
    h.state = editorState({ mode: "view" });
    const html = screen();
    expect(html).toContain("An earlier revision, shown read-only.");
    expect(html).toContain("A newer revision of this document exists.");
    expect(html).toContain("Open latest");
    expect(html).not.toContain("Publish revision");
    expect(html).not.toContain("Open editor");
    expect(html).toContain(">Close<");
  });
  it("the guard's navigation replaces the trapped entry rather than pushing past it", () => {
    h.head = { latest: true, headVersionId: target.versionId };
    h.state = editorState({});
    screen();
    h.handlers!.navigate("/leave-target");
    expect(h.replace).toHaveBeenCalledWith("/leave-target");
    expect(h.push).not.toHaveBeenCalled();
  });
  it("the head opens for editing with Publish revision and Close editor; no editor action is offered until the head is known", () => {
    h.head = { latest: true, headVersionId: target.versionId };
    h.state = editorState({});
    const html = screen();
    expect(html).toContain("Publish revision");
    expect(html).toContain("Close editor");
    expect(html).not.toContain("shown read-only");
    h.head = null;
    h.state = editorState({ frame: false, ready: false });
    expect(screen()).not.toContain("Open editor");
    expect(
      renderToStaticMarkup(
        createElement(OfficeDraftControls, {
          editor: {
            ownsEditor: () => true,
          } as unknown as Parameters<typeof OfficeDraftControls>[0]["editor"],
          state: editorState({ frame: false, ready: false }),
          readOnly: false,
        }),
      ),
    ).toContain("Open editor");
  });
});

const version = (mimeType: string, versionId: string): LibraryVersion =>
  ({
    versionId,
    artifactId: "a",
    parentVersionId: null,
    filename: "f",
    mimeType,
    binding: {
      tenantId: viewer.tenantId,
      actorId: viewer.actorId,
      conversationId,
    },
    scopes: [{ kind: "private-user", resourceId: viewer.actorId }],
    object: { bytes: 1, sha256: "a".repeat(64) },
    createdAt: "2026-11-02T00:00:00.000Z",
  }) as unknown as LibraryVersion;
const docx = version(
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "00000000-0000-4000-8000-00000000000a",
);
const text = version("text/plain", "00000000-0000-4000-8000-00000000000b");

describe("Office documents and the Files library", () => {
  it("the Workspace lists only Office versions and Files lists none of them", () => {
    expect(libraryRows([docx, text], true)).toEqual([docx]);
    expect(libraryRows([docx, text], false)).toEqual([text]);
  });
  it("a selected Office version opens in the Workspace only from the Workspace's own list", () => {
    const render = (officeOpen?: (version: LibraryVersion) => void) =>
      renderToStaticMarkup(
        createElement(LibrarySelectedVersion, {
          port: {} as Parameters<typeof LibrarySelectedVersion>[0]["port"],
          controller: {} as Parameters<
            typeof LibrarySelectedVersion
          >[0]["controller"],
          state: { busy: false, versions: [docx] } as unknown as Parameters<
            typeof LibrarySelectedVersion
          >[0]["state"],
          selected: docx,
          officeOpen,
        }),
      );
    expect(render(() => {})).toContain("Open in Workspace");
    expect(render()).not.toContain("Open in Workspace");
  });
});
