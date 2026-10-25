import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST as conversations } from "../src/app/api/conversations/[...path]/route";
import { POST as bootstrap } from "../src/app/api/capiro/[operation]/route";
import { POST as files } from "../src/app/api/documents/[operation]/route";
import { POST as actions } from "../src/app/api/action-followthrough/[operation]/route";
import { POST as taskUpdates } from "../src/app/api/task-commands/[operation]/route";
import { POST as conversationApprovals } from "../src/app/api/conversations/intents/[operation]/route";
import { POST as preferences } from "../src/app/api/settings/user/[operation]/route";
import { GET as memory } from "../src/app/api/memory/owner/items/route";
import { readMeriCapabilities } from "../src/shared/meri-resources/capabilities.server";
import { meriCapabilityHref } from "../src/shared/meri-resources/capabilities";
import {
  allCapabilitiesEnv,
  capabilityFlags,
  previewCapabilitiesEnv,
} from "./meri-capabilities-fixtures";

const clerk = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => clerk);
const fetcher = vi.fn<typeof fetch>();
const routes = [
  {
    id: "conversations",
    path: "/api/conversations/history",
    invoke: (request: Request) =>
      conversations(request, {
        params: Promise.resolve({ path: ["history"] }),
      }),
  },
  {
    id: "newConversation",
    path: "/api/capiro/meri.conversation.bootstrap",
    invoke: (request: Request) =>
      bootstrap(request, {
        params: Promise.resolve({ operation: "meri.conversation.bootstrap" }),
      }),
  },
  {
    id: "files",
    path: "/api/documents/create",
    invoke: (request: Request) =>
      files(request, { params: Promise.resolve({ operation: "create" }) }),
  },
  {
    id: "actions",
    path: "/api/action-followthrough/query",
    invoke: (request: Request) =>
      actions(request, { params: Promise.resolve({ operation: "query" }) }),
  },
  {
    id: "routines",
    path: "/api/action-followthrough/routine-list",
    invoke: (request: Request) =>
      actions(request, {
        params: Promise.resolve({ operation: "routine-list" }),
      }),
  },
  {
    id: "taskUpdates",
    path: "/api/task-commands/prepare",
    invoke: (request: Request) =>
      taskUpdates(request, {
        params: Promise.resolve({ operation: "prepare" }),
      }),
  },
  {
    id: "conversationApprovals",
    path: "/api/conversations/intents/list",
    invoke: (request: Request) =>
      conversationApprovals(request, {
        params: Promise.resolve({ operation: "list" }),
      }),
  },
  { id: "memory", path: "/api/memory/owner/items?limit=25", invoke: memory },
  {
    id: "preferences",
    path: "/api/settings/user/read",
    invoke: (request: Request) =>
      preferences(request, { params: Promise.resolve({ operation: "read" }) }),
  },
] as const;

function configure(env: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
}

function requestFor(route: (typeof routes)[number], origin: string) {
  return new Request(`${origin}${route.path}`, {
    method: route.id === "memory" ? "GET" : "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(route.id === "memory"
      ? {}
      : {
          body:
            route.id === "newConversation"
              ? JSON.stringify({
                  body: {
                    schemaVersion: 1,
                    requestId: "22222222-2222-4222-8222-222222222222",
                    clientId: "33333333-3333-4333-8333-333333333333",
                  },
                })
              : "{}",
        }),
  });
}

beforeEach(() => {
  clerk.auth.mockResolvedValue({ userId: null, getToken: vi.fn() });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("existing navigation never unlocks disabled native APIs or bypasses authentication", async () => {
  const env = {
    ...allCapabilitiesEnv,
    ...Object.fromEntries(
      Object.values(capabilityFlags).map((flag) => [flag, "false"]),
    ),
  };
  configure(env);
  const state = readMeriCapabilities(env);
  for (const route of routes) {
    expect(state[route.id].status, route.id).toBe("off");
    expect(Boolean(meriCapabilityHref(route.id, state)), route.id).toBe(
      [
        "conversations",
        "files",
        "actions",
        "taskUpdates",
        "preferences",
        "routines",
      ].includes(route.id),
    );
    expect(
      (await route.invoke(requestFor(route, env.CAPIRO_REQUEST_ORIGIN!)))
        .status,
      route.path,
    ).toBe(route.id === "conversations" ? 502 : 503);
  }
  expect(clerk.auth).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("ordinary enabled capabilities reach the actual authentication gate without granting browser authority", async () => {
  configure(allCapabilitiesEnv);
  const state = readMeriCapabilities(allCapabilitiesEnv);
  for (const route of routes) {
    expect(state[route.id].status, route.id).toBe("on");
    expect(meriCapabilityHref(route.id, state), route.id).toBeDefined();
    expect(
      (
        await route.invoke(
          requestFor(route, allCapabilitiesEnv.CAPIRO_REQUEST_ORIGIN!),
        )
      ).status,
      route.path,
    ).toBe(401);
  }
  expect(clerk.auth).toHaveBeenCalledTimes(routes.length);
  expect(fetcher).not.toHaveBeenCalled();
});

it("preview capability holds agree with actual API containment despite every ordinary flag being enabled", async () => {
  configure(previewCapabilitiesEnv);
  const state = readMeriCapabilities(previewCapabilitiesEnv);
  for (const route of routes) {
    const permitted =
      route.id === "conversations" || route.id === "newConversation";
    expect(state[route.id].status, route.id).toBe(permitted ? "on" : "off");
    expect(
      (
        await route.invoke(
          requestFor(route, previewCapabilitiesEnv.CAPIRO_REQUEST_ORIGIN),
        )
      ).status,
      route.path,
    ).toBe(permitted ? 401 : 503);
  }
  expect(clerk.auth).toHaveBeenCalledTimes(2);
  expect(fetcher).not.toHaveBeenCalled();
});
