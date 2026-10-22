import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../src/shared/portfolio/config/config";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { workspaceCommentOperations } from "../src/shared/capiro/operations/workspace-comments";

const origin = "https://frontend.synthetic.invalid";
const token = "synthetic-trusted-session";
const unavailable = {
  message:
    "The requested action or record is unavailable from the current service.",
};
const documentId = "00000000-0000-4000-8000-000000000004";
const draftId = "00000000-0000-4000-8000-000000000003";
const commentId = "00000000-0000-4000-8000-000000000005";
type Route = {
  name: string;
  method: string;
  path: string;
  body?: Record<string, unknown>;
  policy?: string;
  status?: number;
};
const commentPath = `documents/${documentId}/comments`;
const lockPath = `drafts/${draftId}/lock`;
const routes: Route[] = [
  { name: "comments", method: "GET", path: commentPath },
  {
    name: "comment create",
    method: "POST",
    path: commentPath,
    body: { body: "Synthetic comment" },
  },
  {
    name: "comment update",
    method: "PATCH",
    path: `${commentPath}/${commentId}`,
    body: { resolved: true },
  },
  {
    name: "comment delete",
    method: "DELETE",
    path: `${commentPath}/${commentId}`,
  },
  {
    name: "comment suggestion",
    method: "POST",
    path: `${commentPath}/${commentId}/suggest`,
  },
  { name: "checks", method: "GET", path: `drafts/${draftId}/checks` },
  { name: "lock status", method: "GET", path: lockPath },
  ...["acquire", "heartbeat", "release", "request", "take-over"].map(
    (action) => ({
      name: `lock ${action}`,
      method: "POST",
      path: `${lockPath}/${action}`,
      ...(["acquire", "request", "take-over"].includes(action)
        ? { body: { name: "Synthetic actor" } }
        : {}),
    }),
  ),
  {
    name: "anonymization",
    method: "POST",
    path: `drafts/${draftId}/anonymize/detect`,
  },
];
const typedComments = [
  {
    key: "workspace.comments",
    method: "GET",
    path: commentPath,
    input: { params: { documentId } },
  },
  {
    key: "workspace.comment.create",
    method: "POST",
    path: commentPath,
    input: { params: { documentId }, body: { body: "Synthetic comment" } },
  },
  {
    key: "workspace.comment.resolve",
    method: "PATCH",
    path: `${commentPath}/${commentId}`,
    input: { params: { documentId, commentId }, body: { resolved: true } },
  },
];

function config(base: string): RuntimeConfig {
  return {
    services: { workspace: base },
    destinations: {},
    authConfigured: true,
    issues: [],
  };
}
function browserRequest(path: string, method: string, body?: unknown) {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Authorization: "Bearer browser-forged-owner",
      Cookie: "session=browser-forged",
      "X-Tenant-Id": "browser-forged-tenant",
      "X-User-Id": "user_owner",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }),
  });
}
function generic(route: Route, base: string, fetcher: typeof fetch) {
  return proxyRequest(
    browserRequest(
      `/api/backend/workspace/${route.path}`,
      route.method.toUpperCase(),
      route.body,
    ),
    "workspace",
    route.path.split("/"),
    config(base),
    async () => token,
    fetcher,
  );
}
function typed(
  operation: (typeof typedComments)[number],
  base: string,
  fetcher: typeof fetch,
) {
  const query =
    operation.method === "GET"
      ? `?input=${encodeURIComponent(JSON.stringify(operation.input))}`
      : "";
  return handleCapiroRequest(
    browserRequest(
      `/api/capiro/${operation.key}${query}`,
      operation.method,
      operation.input,
    ),
    operation.key,
    workspaceCommentOperations,
    config(base),
    async () => token,
    fetcher,
  );
}
function assertDispatch(
  fetcher: ReturnType<typeof vi.fn<typeof fetch>>,
  base: string,
  route: Route,
) {
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(`${base}/${route.path}`);
  expect(init).toMatchObject({
    method: route.method.toUpperCase(),
    redirect: "error",
    cache: "no-store",
  });
  const headers = new Headers(init?.headers);
  expect(headers.get("authorization")).toBe(`Bearer ${token}`);
  for (const key of ["cookie", "x-tenant-id", "x-user-id", "origin"])
    expect(headers.has(key)).toBe(false);
}
async function assertOpaque(response: Response) {
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual(unavailable);
  expect(response.headers.get("cache-control")).toBe("no-store");
}

it.each(routes)(
  "generic $name preserves an opaque refusal and forwards only trusted authority",
  async (route) => {
    const base = "https://workspace.synthetic.invalid/workspace-api";
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          message: "PRIVATE_DESCENDANT_CONTENT",
          holderId: "user_owner",
          comments: ["private"],
        },
        { status: 404 },
      ),
    );
    await assertOpaque(await generic(route, base, fetcher));
    assertDispatch(fetcher, base, route);
  },
);
it.each(typedComments)(
  "typed $key preserves an opaque refusal and forwards only trusted authority",
  async (operation) => {
    const base = "https://workspace.synthetic.invalid/workspace-api";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { message: "PRIVATE_DESCENDANT_CONTENT", replies: ["private"] },
          { status: 404 },
        ),
      );
    await assertOpaque(await typed(operation, base, fetcher));
    assertDispatch(fetcher, base, {
      name: operation.key,
      method: operation.method,
      path: operation.path,
    });
  },
);

// Enabled only by the backend's explicit ws03-gateway-authority runner. The
// normal frontend suite reports these as skipped, never as integration passes.
const service = process.env.WS03_WORKSPACE_TEST_URL;
const control = process.env.WS03_WORKSPACE_CONTROL_URL;
const joined = Boolean(service && control);
type Manifest = {
  routes: Route[];
  adjacentRoutes: Route[];
  ids: {
    documentId: string;
    draftId: string;
    commentId: string;
    foreignTenantId: string;
  };
};
type State = Record<string, string | boolean>;
let manifest: Manifest;
function loopback(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1")
    throw new Error(
      "Workspace integration fixtures must use explicit loopback HTTP.",
    );
  return url.href.replace(/\/$/, "");
}
async function fixture(path: string, state?: State) {
  const response = await fetch(`${loopback(control!)}/${path}`, {
    method: state ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(state ? { body: JSON.stringify(state) } : {}),
  });
  expect(response.ok).toBe(true);
  return response.json();
}
async function noDescendants() {
  expect(await fixture("observations")).toEqual({ reads: [], effects: [] });
}
const denied: Array<{ name: string; state: State }> = [
  {
    name: "same-tenant unrelated member",
    state: { actorId: "user_unrelated" },
  },
  { name: "foreign tenant", state: { tenantId: "foreign" } },
  { name: "missing draft", state: { exists: false } },
  { name: "removed member", state: { member: false } },
  { name: "inactive tenant", state: { tenantActive: false } },
  { name: "inactive client", state: { clientActive: false } },
  { name: "revoked client wall", state: { wallAllowed: false } },
  {
    name: "removed collaborator",
    state: { actorId: "user_editor", revokedCollaborator: true },
  },
  {
    name: "held draft collaborator",
    state: { actorId: "user_editor", held: true },
  },
  {
    name: "revoked prospect capability",
    state: { prospect: true, prospectEnabled: false },
  },
];
const allowed: Array<{ name: string; state: State; readOnly: boolean }> = [
  { name: "owner", state: {}, readOnly: false },
  { name: "editor", state: { actorId: "user_editor" }, readOnly: false },
  { name: "viewer", state: { actorId: "user_viewer" }, readOnly: true },
  { name: "held owner", state: { held: true }, readOnly: true },
  { name: "prospect owner", state: { prospect: true }, readOnly: true },
];

describe.skipIf(!joined)(
  "actual gateway to local Workspace HTTP admission",
  () => {
    beforeAll(async () => {
      loopback(service!);
      manifest = (await fixture("manifest")) as Manifest;
      expect(manifest.ids).toMatchObject({ documentId, draftId, commentId });
      expect(
        manifest.routes
          .map((route) => `${route.method.toUpperCase()} ${route.path}`)
          .sort(),
      ).toEqual(routes.map((route) => `${route.method} ${route.path}`).sort());
    });
    it.each(denied)(
      "$name receives 404 with no descendant read or side effect through both gateways",
      async ({ state }) => {
        const authority = {
          ...state,
          ...(state.tenantId ? { tenantId: manifest.ids.foreignTenantId } : {}),
        };
        for (const route of manifest.routes) {
          await fixture("reset", authority);
          const fetcher = vi.fn<typeof fetch>(fetch);
          await assertOpaque(await generic(route, service!, fetcher));
          assertDispatch(fetcher, service!, route);
          await noDescendants();
        }
        for (const operation of typedComments) {
          await fixture("reset", authority);
          const fetcher = vi.fn<typeof fetch>(fetch);
          await assertOpaque(await typed(operation, service!, fetcher));
          assertDispatch(fetcher, service!, {
            name: operation.key,
            method: operation.method,
            path: operation.path,
          });
          await noDescendants();
        }
      },
    );
    it.each(allowed)(
      "preserves authorized $name access",
      async ({ state, readOnly }) => {
        for (const route of manifest.routes.filter(
          (item) => !readOnly || item.policy === "read",
        )) {
          await fixture("reset", state);
          const response = await generic(route, service!, fetch);
          expect(response.status, route.name).toBe(route.status);
          expect(await response.json()).not.toEqual(unavailable);
          const observed = (await fixture("observations")) as {
            reads: string[];
            effects: string[];
          };
          expect(
            observed.reads.length + observed.effects.length,
            route.name,
          ).toBeGreaterThan(0);
        }
      },
    );
    it.each(typedComments)(
      "preserves authorized typed $key success",
      async (operation) => {
        await fixture("reset", {});
        const response = await typed(operation, service!, fetch);
        expect(response.status).toBe(operation.method === "POST" ? 201 : 200);
        expect(await response.json()).not.toEqual(unavailable);
      },
    );
  },
);

// These cases extend the same gateway/fixture boundary to the three classified
// WS-03 findings. Versions intentionally retain their existing 403 admission.
const adjacentRoutes: Route[] = [
  {
    name: "documents list",
    method: "GET",
    path: `drafts/${draftId}/documents`,
  },
  {
    name: "quality fix",
    method: "POST",
    path: `drafts/${draftId}/agent/quality/issues/missing-context/fix`,
    body: { expectedRevision: 0, instruction: "Synthetic fix" },
  },
  { name: "version list", method: "GET", path: `drafts/${draftId}/versions` },
  {
    name: "version create",
    method: "POST",
    path: `drafts/${draftId}/versions`,
    body: { label: "Synthetic revision" },
  },
  {
    name: "version restore",
    method: "POST",
    path: `drafts/${draftId}/versions/00000000-0000-4000-8000-00000000000b/restore`,
  },
];
it.each(adjacentRoutes)(
  "generic $name preserves opaque upstream 404",
  async (route) => {
    const base = "https://workspace.synthetic.invalid/workspace-api";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { message: "PRIVATE_DESCENDANT_CONTENT" },
          { status: 404 },
        ),
      );
    await assertOpaque(await generic(route, base, fetcher));
    assertDispatch(fetcher, base, route);
  },
);
const adjacentOwnerControls: Array<{ name: string; state: State }> = [
  { name: "held owner", state: { held: true } },
  { name: "prospect owner", state: { prospect: true } },
];
describe.skipIf(!joined)(
  "classified WS-03 corrections through the actual gateway",
  () => {
    beforeAll(async () => {
      loopback(service!);
      manifest = (await fixture("manifest")) as Manifest;
      expect(
        manifest.adjacentRoutes
          .map((route) => `${route.method.toUpperCase()} ${route.path}`)
          .sort(),
      ).toEqual(
        adjacentRoutes.map((route) => `${route.method} ${route.path}`).sort(),
      );
    });
    it.each(denied)(
      "$name has no protected descendant payload/read/effect",
      async ({ state }) => {
        const authority = {
          ...state,
          ...(state.tenantId ? { tenantId: manifest.ids.foreignTenantId } : {}),
        };
        for (const route of manifest.adjacentRoutes) {
          await fixture("reset", authority);
          const fetcher = vi.fn<typeof fetch>(fetch);
          const response = await generic(route, service!, fetcher);
          const version = route.name.startsWith("version");
          const status =
            version && state.exists !== false && !state.tenantId ? 403 : 404;
          expect(response.status, route.name).toBe(status);
          if (status === 404) await assertOpaque(response);
          else
            expect(JSON.stringify(await response.json())).not.toContain(
              "PRIVATE_DESCENDANT_CONTENT",
            );
          expect(response.headers.get("cache-control")).toBe("no-store");
          assertDispatch(fetcher, service!, route);
          await noDescendants();
        }
      },
    );
    it.each(["owner", "editor", "reviewer", "commenter", "viewer"])(
      "preserves %s role predicates",
      async (role) => {
        for (const route of manifest.adjacentRoutes) {
          await fixture("reset", { actorId: `user_${role}` });
          const allowed =
            route.policy === "read" || ["owner", "editor"].includes(role);
          const response = await generic(route, service!, fetch);
          expect(response.status, route.name).toBe(
            allowed ? route.status : 403,
          );
          const payload: unknown = await response.json();
          if (allowed) {
            expect(payload).not.toEqual(unavailable);
            const observed = (await fixture("observations")) as {
              reads: string[];
              effects: string[];
            };
            expect(
              observed.reads.length + observed.effects.length,
            ).toBeGreaterThan(0);
          } else {
            expect(JSON.stringify(payload)).not.toContain(
              "PRIVATE_DESCENDANT_CONTENT",
            );
            await noDescendants();
          }
        }
      },
    );
    it.each(adjacentOwnerControls)(
      "preserves $name and the existing prospect transfer refusal",
      async ({ state }) => {
        for (const route of manifest.adjacentRoutes) {
          await fixture("reset", state);
          const refused = state.prospect && route.name === "quality fix";
          const response = await generic(route, service!, fetch);
          expect(response.status, route.name).toBe(
            refused ? 403 : route.status,
          );
          if (refused) await noDescendants();
        }
      },
    );
    it("refuses forged draft IDs before protected reads or effects", async () => {
      for (const route of manifest.adjacentRoutes) {
        await fixture("reset", {});
        await assertOpaque(
          await generic(
            {
              ...route,
              path: route.path.replace(
                draftId,
                "00000000-0000-4000-8000-000000000008",
              ),
            },
            service!,
            fetch,
          ),
        );
        await noDescendants();
      }
    });
  },
);
