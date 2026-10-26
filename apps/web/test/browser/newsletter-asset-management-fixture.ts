import type { Page, Route } from "@playwright/test";
import {
  assetFixture,
  asset,
  assetDetails,
  assetId,
  secondId,
} from "./newsletter-assets-fixture";

export const folderId = "30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const createdFolderId = "40000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const folder = { id: folderId, name: "Synthetic briefings" };
export type ManagementOperation =
  | "folders"
  | "createFolder"
  | "renameFolder"
  | "deleteFolder"
  | "move"
  | "rename"
  | "delete"
  | "import"
  | "revisions"
  | "list"
  | "detail";
type FixtureInput = {
  params: { id: string };
  query: { page: number; pageSize: number; folder?: string };
  body: { name: string; folderId: string | null };
};
const operationNames: Record<string, ManagementOperation> = {
  "assetFolders.list": "folders",
  "assetFolders.create": "createFolder",
  "assetFolders.rename": "renameFolder",
  "assetFolders.delete": "deleteFolder",
  "assets.move": "move",
  "assets.rename": "rename",
  "assets.delete": "delete",
  "assets.import": "import",
  "assets.revisions": "revisions",
  "assets.list": "list",
  "assets.detail": "detail",
};
/** Visibly synthetic HTTP fixtures; no database, importer or asset origin is contacted. */
export async function assetManagementFixture(page: Page) {
  const base = await assetFixture(page);
  const state = {
    folders: [{ ...folder }],
    name: asset().name,
    deleted: false,
    folderId: null as string | null,
  };
  const requests: {
    operation: ManagementOperation;
    method: string;
    input: unknown;
  }[] = [];
  const queued = new Map<
    ManagementOperation,
    ((route: Route) => Promise<void>)[]
  >();
  await page.route(
    "**/api/capiro/workspace.richNewsletter.**",
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const name = url.pathname.split("workspace.richNewsletter.")[1]!;
      const operation = operationNames[name];
      if (!operation) return route.fallback();
      const input =
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : request.postDataJSON();
      requests.push({ operation, method: request.method(), input });
      const override = queued.get(operation)?.shift();
      if (override) return override(route);
      const reply = managementReply(operation, input, state);
      return route.fulfill({ json: reply });
    },
  );
  return {
    ...base,
    state,
    managementRequests: requests,
    managementCalls: (operation: ManagementOperation) =>
      requests.filter((request) => request.operation === operation),
    queueManagement: (
      operation: ManagementOperation,
      response: (route: Route) => Promise<void>,
    ) => queued.set(operation, [...(queued.get(operation) ?? []), response]),
  };
}
function managementReply(
  operation: ManagementOperation,
  input: FixtureInput,
  state: {
    folders: { id: string; name: string }[];
    name: string;
    deleted: boolean;
    folderId: string | null;
  },
) {
  switch (operation) {
    case "folders":
      return { items: state.folders };
    case "createFolder": {
      const created = { id: createdFolderId, name: input.body.name };
      state.folders.push(created);
      return created;
    }
    case "renameFolder": {
      const renamed = state.folders.find(
        (item) => item.id === input.params.id,
      )!;
      renamed.name = input.body.name;
      return renamed;
    }
    case "deleteFolder":
      state.folders = state.folders.filter(
        (item) => item.id !== input.params.id,
      );
      state.folderId = null;
      return { deleted: true };
    case "move":
      state.folderId = input.body.folderId;
      return { moved: 1 };
    case "rename":
      state.name = input.body.name;
      return asset(assetId, state.name);
    case "delete":
      state.deleted = true;
      return { deleted: 1 };
    case "import":
      return asset(secondId, "Synthetic imported image");
    case "detail":
      return {
        ...assetDetails(input.params.id),
        name:
          input.params.id === secondId
            ? "Synthetic imported image"
            : state.name,
      };
    case "revisions":
      return {
        ...input.query,
        total: 11,
        items: [
          {
            ...assetDetails(input.query.page === 1 ? assetId : secondId),
            revisionNumber: input.query.page === 1 ? 2 : 1,
            currentRevision: input.query.page === 1,
          },
        ],
      };
    case "list": {
      const visible =
        !state.deleted &&
        (!input.query.folder ||
          (input.query.folder === "unfiled"
            ? state.folderId === null
            : state.folderId === input.query.folder));
      return {
        page: input.query.page,
        pageSize: input.query.pageSize,
        total: visible ? 1 : 0,
        items: visible ? [asset(assetId, state.name)] : [],
      };
    }
  }
}
