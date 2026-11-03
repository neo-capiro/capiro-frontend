import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { MeriFilesHost } from "../src/app/meri/files/MeriFilesHost";

/**
 * VQA-010: the Files page admits the saved library for General (no client selection) while
 * creating a document needs a selected client. The creation notice must state that split
 * instead of telling the whole page that a client is required to open document files.
 */
type Selection =
  | { state: "no-selection" }
  | { state: "loading"; requestedId: string }
  | {
      state: "authorized-client";
      requestedId: string;
      client: { id: string; name: string };
    }
  | { state: "unavailable"; requestedId: string };

const scene = vi.hoisted(() => ({
  selection: { state: "no-selection" } as Selection,
  identity: {
    data: {
      user: { id: "synthetic-actor" },
      tenant: { id: "synthetic-tenant" },
    } as {
      user: { id: string };
      tenant: { id: string };
    } | null,
    error: null as Error | null,
    isFetching: false,
  },
}));

vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => scene.selection,
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => scene.identity,
  identitySchema: {},
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ({ request: vi.fn() }),
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: vi.fn() }),
}));
vi.mock("../src/shared/meri-resources/CapabilityContext", () => ({
  useMeriCapabilities: () => ({ newConversation: { status: "off" } }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("../src/features/meri/files/LegacyReportLibrary", () => ({
  LegacyReportLibrary: ({ clientId }: { clientId?: string }) =>
    createElement("output", { "data-legacy-library": clientId ?? "general" }),
}));
vi.mock("../src/features/meri/files/DocumentLibrary", () => ({
  DocumentLibrary: ({ clientId }: { clientId?: string }) =>
    createElement("output", { "data-document-library": clientId ?? "general" }),
}));
vi.mock("../src/features/meri/files/MeriFilesWorkflow", () => ({
  MeriFilesWorkflow: ({ contextLabel }: { contextLabel: string }) =>
    createElement("output", { "data-document-workflow": contextLabel }),
}));

const render = () =>
  renderToStaticMarkup(
    createElement(MeriFilesHost, { enabled: true, operation: "create_word" }),
  );

it("General keeps the saved library and scopes the client requirement to creation", () => {
  scene.selection = { state: "no-selection" };
  const html = render();
  // The saved library and legacy reports are admitted without a client selection.
  expect(html).toContain('data-document-library="general"');
  expect(html).toContain('data-legacy-library="general"');
  // Creation is the only part that needs a client, and the copy says so.
  expect(html).toMatch(/<h1>Files<\/h1>/);
  expect(html).toContain(
    "Saved files you can already access are available without a client. Creating a new document needs a selected client.",
  );
  expect(html).toContain(
    "Choose a currently available client in Portfolio to create a new document.",
  );
  // The previous page-level claim that a client is needed to open document files is gone.
  expect(html).not.toContain("Choose a client");
  expect(html).not.toContain("to open document files");
});

it("an authorized client keeps the saved library and offers creation for that client", () => {
  scene.selection = {
    state: "authorized-client",
    requestedId: "synthetic-client",
    client: { id: "synthetic-client", name: "Synthetic client" },
  };
  const html = render();
  expect(html).toContain('data-document-library="synthetic-client"');
  expect(html).toContain("Client: Synthetic client.");
  expect(html).toContain("Connect document service");
  expect(html).not.toContain("Creating a new document needs a selected client");
});

it("a denied client scope withholds the saved library and names the verification failure", () => {
  scene.selection = { state: "unavailable", requestedId: "synthetic-client" };
  const html = render();
  expect(html).not.toContain("data-document-library=");
  expect(html).toContain(
    "Current account and client access must be verified before loading saved files.",
  );
  expect(html).toMatch(/<h1>Selected client unavailable<\/h1>/);
  expect(html).toContain(
    "Current client access must be verified before continuing.",
  );
  expect(html).not.toContain("Creating a new document needs a selected client");
});
